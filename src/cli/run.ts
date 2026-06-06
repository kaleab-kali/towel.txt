import { constants } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { packageName, packageVersion } from "../meta.js";
import { extractHeadings } from "../parser/headings.js";
import { extractImageReferences, type ImageReference } from "../parser/images.js";
import { getMetadataWarnings, parseMarkdownInput } from "../parser/metadata.js";
import { renderDocument } from "../render/document.js";
import { minifyHtml } from "../render/minify.js";
import {
  CliStrictModeError,
  CliUsageError,
  type CliCommand,
  type CliRenderOptions,
  type OutputFormat,
  parseCliArgs
} from "./args.js";
import { copyLocalImageAssets, type ImageAssetCopyResult } from "./assets.js";
import { type CliConfigDefaults, type LoadedCliConfig, loadCliConfig } from "./config.js";
import { cliExitCodes, type CliExitCode } from "./exit-codes.js";
import { type PdfPrintOptions, printHtmlToPdf } from "./pdf.js";
import { getImageAssetWarning, getImageAssetWarnings, writeRenderSummary } from "./summary.js";
import { type WatchFilesOptions, watchFiles } from "./watch.js";

export interface CliIo {
  cwd: string;
  pdfPrinter?: (options: PdfPrintOptions) => Promise<void>;
  signal?: AbortSignal;
  stderr: Pick<NodeJS.WriteStream, "write">;
  stdin?: NodeJS.ReadableStream;
  stdout: Pick<NodeJS.WriteStream, "write">;
  watcher?: (options: WatchFilesOptions) => Promise<void>;
}

export async function runCli(argv: string[], io: CliIo = defaultCliIo()): Promise<number> {
  try {
    const parsedCommand = parseCliArgs(argv);

    if (parsedCommand.kind === "help") {
      io.stdout.write(getHelpText());
      return cliExitCodes.success;
    }

    if (parsedCommand.kind === "version") {
      io.stdout.write(`${packageName} ${packageVersion}\n`);
      return cliExitCodes.success;
    }

    const loadedConfig = await loadCliConfig({
      configPath: parsedCommand.configPath,
      cwd: io.cwd,
      noConfig: parsedCommand.noConfig
    });
    const command = applyConfigDefaults(parsedCommand, loadedConfig?.defaults);
    const outputFormat = getOutputFormat(command.format, command.outputPath);
    const inputPath = command.inputPath ? path.resolve(io.cwd, command.inputPath) : undefined;
    const outputPath = command.stdout
      ? undefined
      : command.outputPath
        ? path.resolve(io.cwd, command.outputPath)
        : command.inputPath
          ? path.resolve(io.cwd, getDefaultOutputPath(command.inputPath, outputFormat))
          : undefined;
    const summaryJsonPath = command.summaryJsonPath
      ? path.resolve(io.cwd, command.summaryJsonPath)
      : undefined;

    if (command.kind === "inspect") {
      await inspectCommand({
        command,
        inputPath,
        io,
        loadedConfig,
        outputFormat,
        outputPath,
        summaryJsonPath
      });
      return cliExitCodes.success;
    }

    if (command.stdin && !command.stdout && !command.outputPath) {
      throw new CliUsageError("Expected --output or --stdout when reading from stdin.");
    }

    if (command.watch && command.stdin) {
      throw new CliUsageError("Watch mode requires an input file instead of --stdin.");
    }

    if (command.watch && command.stdout) {
      throw new CliUsageError("Watch mode requires file output instead of --stdout.");
    }

    if (command.stdout && outputFormat === "pdf") {
      throw new CliUsageError("PDF output requires --output instead of --stdout.");
    }

    await renderCommand({
      allowOverwrite: false,
      command,
      inputPath,
      io,
      outputFormat,
      outputPath,
      summaryJsonPath
    });

    if (command.watch) {
      const watchedFiles = getWatchedFiles(command, inputPath, io.cwd);
      io.stdout.write(
        `Watching ${watchedFiles.map((filePath) => displayPath(io.cwd, filePath)).join(", ")}\n`
      );

      await (io.watcher ?? watchFiles)({
        files: watchedFiles,
        onChange: async (changedFilePath) => {
          io.stdout.write(`Change detected: ${displayPath(io.cwd, changedFilePath)}\n`);

          try {
            await renderCommand({
              allowOverwrite: true,
              command,
              inputPath,
              io,
              outputFormat,
              outputPath,
              summaryJsonPath
            });
          } catch (error) {
            writeCliError(io, error);
          }
        },
        signal: io.signal
      });
    }

    return cliExitCodes.success;
  } catch (error) {
    writeCliError(io, error);
    return getCliErrorExitCode(error);
  }
}

type RenderCommand = Extract<CliCommand, { kind: "render" }>;
type InspectCommand = Extract<CliCommand, { kind: "inspect" }>;

function applyConfigDefaults<T extends CliRenderOptions & { kind: "inspect" | "render" }>(
  command: T,
  defaults: CliConfigDefaults | undefined
): T {
  if (!defaults) {
    return command;
  }

  return {
    ...command,
    assetDirectory: command.assetDirectory ?? defaults.assetDirectory,
    browserPath: command.browserPath ?? defaults.browserPath,
    cover: command.coverSpecified ? command.cover : (defaults.cover ?? command.cover),
    coverSpecified: command.coverSpecified || defaults.cover !== undefined,
    cssPath: command.cssPath ?? defaults.cssPath,
    format: command.format ?? defaults.format,
    margin: command.margin ?? defaults.margin,
    minify: command.minifySpecified ? command.minify : (defaults.minify ?? command.minify),
    minifySpecified: command.minifySpecified || defaults.minify !== undefined,
    outputPath: command.outputPath ?? defaults.outputPath,
    pageSize: command.pageSize ?? defaults.pageSize,
    strict: command.strictSpecified ? command.strict : (defaults.strict ?? command.strict),
    strictSpecified: command.strictSpecified || defaults.strict !== undefined,
    subtitle: command.subtitle ?? defaults.subtitle,
    summaryJsonPath: command.summaryJsonPath ?? defaults.summaryJsonPath,
    tableOfContents: command.tableOfContentsSpecified
      ? command.tableOfContents
      : (defaults.tableOfContents ?? command.tableOfContents),
    theme: command.theme ?? defaults.theme,
    title: command.title ?? defaults.title
  } as T;
}

async function inspectCommand({
  command,
  inputPath,
  io,
  loadedConfig,
  outputFormat,
  outputPath,
  summaryJsonPath
}: {
  command: InspectCommand;
  inputPath: string | undefined;
  io: CliIo;
  loadedConfig: LoadedCliConfig | undefined;
  outputFormat: OutputFormat;
  outputPath: string | undefined;
  summaryJsonPath: string | undefined;
}): Promise<void> {
  const markdown = command.stdin
    ? await readStdin(io.stdin ?? Readable.from([]))
    : await readFile(requiredInputPath(inputPath), "utf8");
  const parsedInput = parseMarkdownInput(markdown);
  const headings = extractHeadings(parsedInput.content).map((heading) => ({
    ...heading,
    line: heading.line + parsedInput.contentLineOffset
  }));
  const title = getTitleInspection(command, parsedInput.metadata, headings);
  const images = await inspectImages(extractImageReferences(markdown), inputPath);
  const warnings = [
    ...getMetadataWarnings(markdown),
    ...images
      .map((image) => getInspectedImageWarning(image))
      .filter((warning): warning is string => Boolean(warning))
  ];
  const blockers = await getRenderPlanBlockers({
    command,
    inputPath,
    outputFormat,
    outputPath,
    summaryJsonPath,
    titleSource: title.source
  });

  io.stdout.write(
    `${JSON.stringify(
      {
        config: {
          defaultsLoaded: Boolean(loadedConfig),
          path: loadedConfig?.path ?? null
        },
        document: {
          headings,
          metadata: parsedInput.metadata,
          title
        },
        images,
        input: {
          bytes: Buffer.byteLength(markdown, "utf8"),
          lines: countLines(markdown),
          mode: command.stdin ? "stdin" : "file",
          path: inputPath ?? null
        },
        package: {
          name: packageName,
          version: packageVersion
        },
        renderPlan: {
          assetDirectory: command.assetDirectory ?? null,
          blockers,
          canRender: blockers.length === 0,
          cssPath: command.cssPath ? path.resolve(io.cwd, command.cssPath) : null,
          format: outputFormat,
          minified: command.minify,
          outputPath: outputPath ?? null,
          pageSize: command.pageSize ?? null,
          pdfBrowserPath: resolveOptionalPath(io.cwd, command.browserPath) ?? null,
          printMargin: command.margin ?? null,
          strict: command.strict,
          stdout: command.stdout,
          summaryJsonPath: summaryJsonPath ?? null,
          tableOfContents: command.tableOfContents,
          theme: command.theme ?? null
        },
        schemaVersion: 1,
        warnings
      },
      null,
      2
    )}\n`
  );
}

interface InspectedImageReference extends ImageReference {
  exists: boolean | null;
  path: string | null;
}

async function inspectImages(
  references: ImageReference[],
  inputPath: string | undefined
): Promise<InspectedImageReference[]> {
  const inputDirectory = inputPath ? path.dirname(inputPath) : undefined;

  return Promise.all(
    references.map(async (reference) => {
      if (reference.status !== "local" || !inputDirectory) {
        return {
          ...reference,
          exists: reference.status === "local" ? null : false,
          path: null
        };
      }

      const imagePath = path.resolve(inputDirectory, reference.source.replace(/\\/g, "/"));

      return {
        ...reference,
        exists: await fileExists(imagePath),
        path: imagePath
      };
    })
  );
}

function getInspectedImageWarning(image: InspectedImageReference): string | undefined {
  if (image.status === "skipped") {
    return `Warning: image asset "${image.source}" was skipped: ${
      image.reason ?? "unsupported image source"
    }`;
  }

  if (image.exists === false) {
    return `Warning: image asset "${image.source}" is missing.`;
  }

  return undefined;
}

function getTitleInspection(
  command: CliRenderOptions,
  metadata: { title?: string },
  headings: Array<{ level: number; text: string }>
): { source: "cli" | "fallback" | "heading" | "metadata"; value: string } {
  if (command.title?.trim()) {
    return {
      source: "cli",
      value: command.title
    };
  }

  if (metadata.title?.trim()) {
    return {
      source: "metadata",
      value: metadata.title
    };
  }

  const heading = headings.find((candidate) => candidate.level === 1);

  if (heading) {
    return {
      source: "heading",
      value: heading.text
    };
  }

  return {
    source: "fallback",
    value: "Untitled Document"
  };
}

async function getRenderPlanBlockers({
  command,
  inputPath,
  outputFormat,
  outputPath,
  summaryJsonPath,
  titleSource
}: {
  command: InspectCommand;
  inputPath: string | undefined;
  outputFormat: OutputFormat;
  outputPath: string | undefined;
  summaryJsonPath: string | undefined;
  titleSource: "cli" | "fallback" | "heading" | "metadata";
}): Promise<string[]> {
  const blockers: string[] = [];

  if (command.stdin && !command.stdout && !command.outputPath) {
    blockers.push("Expected --output or --stdout when reading from stdin.");
  }

  if (command.stdout && outputFormat === "pdf") {
    blockers.push("PDF output requires --output instead of --stdout.");
  }

  if (command.stdin && titleSource === "fallback") {
    blockers.push("Expected --title, front matter title, or H1 when reading from stdin.");
  }

  if (inputPath && outputPath && pathsAreEqual(inputPath, outputPath)) {
    blockers.push("Output path cannot replace the input Markdown file.");
  }

  if (outputPath && !command.force && (await fileExists(outputPath))) {
    blockers.push("Output file already exists. Use --force to overwrite.");
  }

  if (summaryJsonPath) {
    if (inputPath && pathsAreEqual(inputPath, summaryJsonPath)) {
      blockers.push("Summary JSON path cannot replace the input Markdown file.");
    }

    if (outputPath && pathsAreEqual(outputPath, summaryJsonPath)) {
      blockers.push("Summary JSON path cannot replace the generated output file.");
    }

    if (!command.force && (await fileExists(summaryJsonPath))) {
      blockers.push("Summary JSON file already exists. Use --force to overwrite.");
    }
  }

  return blockers;
}

function countLines(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  return value.split(/\r?\n/).length;
}

async function renderCommand({
  allowOverwrite,
  command,
  inputPath,
  io,
  outputFormat,
  outputPath,
  summaryJsonPath
}: {
  allowOverwrite: boolean;
  command: RenderCommand;
  inputPath: string | undefined;
  io: CliIo;
  outputFormat: OutputFormat;
  outputPath: string | undefined;
  summaryJsonPath: string | undefined;
}): Promise<void> {
  const force = allowOverwrite || command.force;

  if (!command.stdout) {
    await assertCanWriteOutput({
      force,
      inputPath,
      outputPath: requiredOutputPath(outputPath)
    });
  }

  if (summaryJsonPath) {
    await assertCanWriteSummaryJson({
      force,
      inputPath,
      outputPath,
      summaryJsonPath
    });
  }

  const markdown = command.stdin
    ? await readStdin(io.stdin ?? Readable.from([]))
    : await readFile(requiredInputPath(inputPath), "utf8");
  const metadataWarnings = getMetadataWarnings(markdown);

  if (command.stdin && !hasTitleSource(markdown, command.title)) {
    throw new CliUsageError("Expected --title, front matter title, or H1 when reading from stdin.");
  }

  const styles = command.cssPath
    ? await readFile(path.resolve(io.cwd, command.cssPath), "utf8")
    : undefined;
  const imageAssets =
    !command.stdout && outputFormat === "html" && inputPath
      ? await copyLocalImageAssets({
          assetDirectory: command.assetDirectory,
          inputPath,
          markdown,
          outputPath: requiredOutputPath(outputPath)
        })
      : [];
  const warnings = [...metadataWarnings, ...getImageAssetWarnings(imageAssets)];

  if (command.strict && warnings.length > 0) {
    throw new CliStrictModeError(formatStrictModeWarnings(warnings));
  }

  const html = renderDocument(markdown, {
    cover: command.coverSpecified ? command.cover : undefined,
    imageSourceMap: createImageSourceMap(imageAssets),
    includeTableOfContents: command.tableOfContents,
    margin: command.margin,
    pageSize: command.pageSize,
    styles,
    subtitle: command.subtitle,
    theme: command.theme,
    title: command.title
  });
  const outputHtml = command.minify ? minifyHtml(html) : html;
  let bytesWritten: number;

  if (command.stdout) {
    io.stdout.write(outputHtml);
    bytesWritten = Buffer.byteLength(outputHtml, "utf8");
  } else {
    await mkdir(path.dirname(requiredOutputPath(outputPath)), { recursive: true });

    if (outputFormat === "pdf") {
      await (io.pdfPrinter ?? printHtmlToPdf)({
        basePath: inputPath ? path.dirname(inputPath) : undefined,
        browserPath: resolveOptionalPath(io.cwd, command.browserPath),
        html,
        outputPath: requiredOutputPath(outputPath)
      });
      bytesWritten = await getFileSize(requiredOutputPath(outputPath));
    } else {
      await writeFile(requiredOutputPath(outputPath), outputHtml, "utf8");
      bytesWritten = Buffer.byteLength(outputHtml, "utf8");

      writeImageAssetDiagnostics(io, imageAssets);
    }
  }

  if (summaryJsonPath) {
    await writeRenderSummary(summaryJsonPath, {
      assetDirectory: command.assetDirectory ?? null,
      bytesWritten,
      format: outputFormat,
      images: imageAssets,
      inputPath: inputPath ?? null,
      minified: command.stdout || outputFormat === "html" ? command.minify : false,
      outputPath: outputPath ?? null,
      stdout: command.stdout,
      warnings
    });
  }

  if (!command.stdout) {
    io.stdout.write(`Wrote ${displayPath(io.cwd, requiredOutputPath(outputPath))}\n`);
  }
}

export function getHelpText(): string {
  return `${packageName}

Usage:
  ${packageName} <input.md> [--output output.html] [--title "Document Title"]
  ${packageName} inspect <input.md> --json
  ${packageName} <input.md> --format pdf --output output.pdf
  ${packageName} <input.md> --watch [--output output.html]
  ${packageName} --stdin --stdout [--title "Document Title"]

Options:
      --asset-dir <d> Place copied image assets under this output directory.
      --browser <path> Use a specific Chrome, Edge, or Chromium executable for PDF export.
      --config <path>  Load defaults from a specific config file.
      --cover          Add a cover page before the document body.
      --css <path>     Append a custom CSS file to the default document styles.
      --force          Overwrite an existing output file.
      --format <type>  Output format: "html" or "pdf". Defaults to html, or pdf for .pdf outputs.
      --json           Write machine-readable inspection output for the inspect command.
      --margin <value> Print page margin, for example "0.75in" or "18mm".
      --minify         Remove formatting whitespace from generated HTML output.
      --no-config      Disable default config file discovery.
      --no-cover       Disable a cover page from metadata or config.
      --no-minify      Disable minified HTML output from config.
      --no-strict      Disable strict mode from config.
      --no-toc         Disable automatic table of contents rendering.
  -o, --output <path>  Output path. Defaults to input filename with the selected extension.
      --page-size <v>  Print page size, for example "letter", "A4", or "A4 landscape".
      --stdin          Read Markdown input from stdin instead of a file.
      --stdout         Write generated HTML to stdout instead of a file.
      --strict         Fail the render when warnings are detected.
      --subtitle <txt> Override the document subtitle.
      --summary-json <path> Write a machine-readable render summary JSON file.
      --theme <name>   Document theme: "default", "compact", or "report".
      --title <title>  Override the document title.
      --toc            Enable table of contents when config disables it.
      --watch          Watch input Markdown and CSS files, rebuilding file output on change.
  -h, --help           Show this help message.
      --version        Show the current version.
`;
}

export function getDefaultOutputPath(inputPath: string, format: OutputFormat = "html"): string {
  const parsedPath = path.parse(inputPath);
  return path.join(parsedPath.dir, `${parsedPath.name}.${format}`);
}

function defaultCliIo(): CliIo {
  return {
    cwd: process.cwd(),
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout
  };
}

function hasTitleSource(markdown: string, title: string | undefined): boolean {
  if (title?.trim()) {
    return true;
  }

  const parsedInput = parseMarkdownInput(markdown);

  return Boolean(
    parsedInput.metadata.title?.trim() ||
    extractHeadings(parsedInput.content).some((heading) => heading.level === 1)
  );
}

function getWatchedFiles(
  command: RenderCommand,
  inputPath: string | undefined,
  cwd: string
): string[] {
  const watchedFiles = [requiredInputPath(inputPath)];

  if (command.cssPath) {
    watchedFiles.push(path.resolve(cwd, command.cssPath));
  }

  return [...new Set(watchedFiles)];
}

function displayPath(cwd: string, filePath: string): string {
  return path.relative(cwd, filePath) || filePath;
}

function formatStrictModeWarnings(warnings: string[]): string {
  const label = warnings.length === 1 ? "warning" : "warnings";

  return [
    `Strict mode failed with ${warnings.length} ${label}:`,
    ...warnings.map((warning) => `- ${warning}`)
  ].join("\n");
}

function writeCliError(io: CliIo, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const prefix = error instanceof CliUsageError ? "Usage error" : "Error";

  io.stderr.write(`${prefix}: ${message}\n`);

  if (error instanceof CliUsageError) {
    io.stderr.write(`Run "${packageName} --help" for usage.\n`);
  }
}

function getCliErrorExitCode(error: unknown): CliExitCode {
  if (error instanceof CliUsageError) {
    return error.exitCode;
  }

  return cliExitCodes.renderError;
}

function writeImageAssetDiagnostics(io: CliIo, imageAssets: ImageAssetCopyResult[]): void {
  imageAssets.forEach((asset) => {
    if (asset.status === "copied") {
      io.stdout.write(`Copied image asset: ${asset.source}\n`);
      return;
    }

    if (asset.reason === "already in output directory") {
      io.stdout.write(`Skipped image asset: ${asset.source} (${asset.reason})\n`);
      return;
    }

    const warning = getImageAssetWarning(asset);

    if (warning) {
      io.stderr.write(`${warning}\n`);
    }
  });
}

function createImageSourceMap(imageAssets: ImageAssetCopyResult[]): Map<string, string> {
  const sourceMap = new Map<string, string>();

  imageAssets.forEach((asset) => {
    if (asset.targetSource) {
      sourceMap.set(asset.source, asset.targetSource);
      sourceMap.set(asset.source.replace(/\\/g, "/"), asset.targetSource);
    }
  });

  return sourceMap;
}

function getOutputFormat(
  format: OutputFormat | undefined,
  outputPath: string | undefined
): OutputFormat {
  if (format) {
    return format;
  }

  if (outputPath && path.extname(outputPath).toLowerCase() === ".pdf") {
    return "pdf";
  }

  return "html";
}

function resolveOptionalPath(cwd: string, value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (path.isAbsolute(value) || value.includes("/") || value.includes("\\")) {
    return path.resolve(cwd, value);
  }

  return value;
}

async function assertCanWriteSummaryJson({
  force,
  inputPath,
  outputPath,
  summaryJsonPath
}: {
  force: boolean;
  inputPath: string | undefined;
  outputPath: string | undefined;
  summaryJsonPath: string;
}): Promise<void> {
  if (inputPath && pathsAreEqual(inputPath, summaryJsonPath)) {
    throw new CliUsageError("Summary JSON path cannot replace the input Markdown file.");
  }

  if (outputPath && pathsAreEqual(outputPath, summaryJsonPath)) {
    throw new CliUsageError("Summary JSON path cannot replace the generated output file.");
  }

  if (!force && (await fileExists(summaryJsonPath))) {
    throw new CliUsageError("Summary JSON file already exists. Use --force to overwrite.");
  }
}

async function assertCanWriteOutput({
  force,
  inputPath,
  outputPath
}: {
  force: boolean;
  inputPath: string | undefined;
  outputPath: string;
}): Promise<void> {
  if (inputPath && pathsAreEqual(inputPath, outputPath)) {
    throw new CliUsageError("Output path cannot replace the input Markdown file.");
  }

  if (!force && (await fileExists(outputPath))) {
    throw new CliUsageError("Output file already exists. Use --force to overwrite.");
  }
}

async function getFileSize(filePath: string): Promise<number> {
  return (await stat(filePath)).size;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;

    if (code === "ENOENT" || code === "ENOTDIR") {
      return false;
    }

    throw error;
  }
}

function pathsAreEqual(firstPath: string, secondPath: string): boolean {
  const first = path.normalize(path.resolve(firstPath));
  const second = path.normalize(path.resolve(secondPath));

  if (process.platform === "win32") {
    return first.toLowerCase() === second.toLowerCase();
  }

  return first === second;
}

function readStdin(stdin: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    Readable.from(stdin)
      .on("data", (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      })
      .on("error", reject)
      .on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
  });
}

function requiredInputPath(inputPath: string | undefined): string {
  if (!inputPath) {
    throw new CliUsageError("Expected exactly one Markdown input file.");
  }

  return inputPath;
}

function requiredOutputPath(outputPath: string | undefined): string {
  if (!outputPath) {
    throw new CliUsageError("Expected --output or --stdout when reading from stdin.");
  }

  return outputPath;
}
