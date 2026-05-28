import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { packageName, packageVersion } from "../meta.js";
import { extractHeadings } from "../parser/headings.js";
import { parseMarkdownInput } from "../parser/metadata.js";
import { renderDocument } from "../render/document.js";
import { CliUsageError, type CliCommand, type OutputFormat, parseCliArgs } from "./args.js";
import { copyLocalImageAssets } from "./assets.js";
import { type CliConfigDefaults, loadCliConfig } from "./config.js";
import { type PdfPrintOptions, printHtmlToPdf } from "./pdf.js";
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
      return 0;
    }

    if (parsedCommand.kind === "version") {
      io.stdout.write(`${packageName} ${packageVersion}\n`);
      return 0;
    }

    const loadedConfig = await loadCliConfig({
      configPath: parsedCommand.configPath,
      cwd: io.cwd,
      noConfig: parsedCommand.noConfig
    });
    const command = applyConfigDefaults(parsedCommand, loadedConfig?.defaults);

    if (command.stdin && !command.stdout && !command.outputPath) {
      throw new CliUsageError("Expected --output or --stdout when reading from stdin.");
    }

    if (command.watch && command.stdin) {
      throw new CliUsageError("Watch mode requires an input file instead of --stdin.");
    }

    if (command.watch && command.stdout) {
      throw new CliUsageError("Watch mode requires file output instead of --stdout.");
    }

    const outputFormat = getOutputFormat(command.format, command.outputPath);

    if (command.stdout && outputFormat === "pdf") {
      throw new CliUsageError("PDF output requires --output instead of --stdout.");
    }

    const inputPath = command.inputPath ? path.resolve(io.cwd, command.inputPath) : undefined;
    const outputPath = command.stdout
      ? undefined
      : path.resolve(
          io.cwd,
          command.outputPath ?? getDefaultOutputPath(command.inputPath ?? "", outputFormat)
        );

    await renderCommand({
      allowOverwrite: false,
      command,
      inputPath,
      io,
      outputFormat,
      outputPath
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
              outputPath
            });
          } catch (error) {
            writeCliError(io, error);
          }
        },
        signal: io.signal
      });
    }

    return 0;
  } catch (error) {
    writeCliError(io, error);
    return 1;
  }
}

type RenderCommand = Extract<CliCommand, { kind: "render" }>;

function applyConfigDefaults(
  command: RenderCommand,
  defaults: CliConfigDefaults | undefined
): RenderCommand {
  if (!defaults) {
    return command;
  }

  return {
    ...command,
    browserPath: command.browserPath ?? defaults.browserPath,
    cssPath: command.cssPath ?? defaults.cssPath,
    format: command.format ?? defaults.format,
    margin: command.margin ?? defaults.margin,
    outputPath: command.outputPath ?? defaults.outputPath,
    pageSize: command.pageSize ?? defaults.pageSize,
    tableOfContents: command.tableOfContentsSpecified
      ? command.tableOfContents
      : (defaults.tableOfContents ?? command.tableOfContents),
    title: command.title ?? defaults.title
  };
}

async function renderCommand({
  allowOverwrite,
  command,
  inputPath,
  io,
  outputFormat,
  outputPath
}: {
  allowOverwrite: boolean;
  command: RenderCommand;
  inputPath: string | undefined;
  io: CliIo;
  outputFormat: OutputFormat;
  outputPath: string | undefined;
}): Promise<void> {
  if (!command.stdout) {
    await assertCanWriteOutput({
      force: allowOverwrite || command.force,
      inputPath,
      outputPath: requiredOutputPath(outputPath)
    });
  }

  const markdown = command.stdin
    ? await readStdin(io.stdin ?? Readable.from([]))
    : await readFile(requiredInputPath(inputPath), "utf8");

  if (command.stdin && !hasTitleSource(markdown, command.title)) {
    throw new CliUsageError("Expected --title, front matter title, or H1 when reading from stdin.");
  }

  const styles = command.cssPath
    ? await readFile(path.resolve(io.cwd, command.cssPath), "utf8")
    : undefined;
  const html = renderDocument(markdown, {
    includeTableOfContents: command.tableOfContents,
    margin: command.margin,
    pageSize: command.pageSize,
    styles,
    title: command.title
  });

  if (command.stdout) {
    io.stdout.write(html);
    return;
  }

  await mkdir(path.dirname(requiredOutputPath(outputPath)), { recursive: true });

  if (outputFormat === "pdf") {
    await (io.pdfPrinter ?? printHtmlToPdf)({
      basePath: inputPath ? path.dirname(inputPath) : undefined,
      browserPath: resolveOptionalPath(io.cwd, command.browserPath),
      html,
      outputPath: requiredOutputPath(outputPath)
    });
  } else {
    await writeFile(requiredOutputPath(outputPath), html, "utf8");

    const imageAssets = inputPath
      ? await copyLocalImageAssets({
          inputPath,
          markdown,
          outputPath: requiredOutputPath(outputPath)
        })
      : [];

    imageAssets.forEach((asset) => {
      if (asset.status === "missing") {
        io.stderr.write(`Warning: image asset "${asset.source}" was not copied: ${asset.error}\n`);
      }
    });
  }

  io.stdout.write(`Wrote ${displayPath(io.cwd, requiredOutputPath(outputPath))}\n`);
}

export function getHelpText(): string {
  return `${packageName}

Usage:
  ${packageName} <input.md> [--output output.html] [--title "Document Title"]
  ${packageName} <input.md> --format pdf --output output.pdf
  ${packageName} <input.md> --watch [--output output.html]
  ${packageName} --stdin --stdout [--title "Document Title"]

Options:
      --browser <path> Use a specific Chrome, Edge, or Chromium executable for PDF export.
      --config <path>  Load defaults from a specific config file.
      --css <path>     Append a custom CSS file to the default document styles.
      --force          Overwrite an existing output file.
      --format <type>  Output format: "html" or "pdf". Defaults to html, or pdf for .pdf outputs.
      --margin <value> Print page margin, for example "0.75in" or "18mm".
      --no-config      Disable default config file discovery.
      --no-toc         Disable automatic table of contents rendering.
  -o, --output <path>  Output path. Defaults to input filename with the selected extension.
      --page-size <v>  Print page size, for example "letter", "A4", or "A4 landscape".
      --stdin          Read Markdown input from stdin instead of a file.
      --stdout         Write generated HTML to stdout instead of a file.
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

function writeCliError(io: CliIo, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  const prefix = error instanceof CliUsageError ? "Usage error" : "Error";

  io.stderr.write(`${prefix}: ${message}\n`);

  if (error instanceof CliUsageError) {
    io.stderr.write(`Run "${packageName} --help" for usage.\n`);
  }
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
