import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { packageName, packageVersion } from "../meta.js";
import { extractHeadings } from "../parser/headings.js";
import { parseMarkdownInput } from "../parser/metadata.js";
import { renderDocument } from "../render/document.js";
import { CliUsageError, parseCliArgs } from "./args.js";
import { copyLocalImageAssets } from "./assets.js";

export interface CliIo {
  cwd: string;
  stderr: Pick<NodeJS.WriteStream, "write">;
  stdin?: NodeJS.ReadableStream;
  stdout: Pick<NodeJS.WriteStream, "write">;
}

export async function runCli(argv: string[], io: CliIo = defaultCliIo()): Promise<number> {
  try {
    const command = parseCliArgs(argv);

    if (command.kind === "help") {
      io.stdout.write(getHelpText());
      return 0;
    }

    if (command.kind === "version") {
      io.stdout.write(`${packageName} ${packageVersion}\n`);
      return 0;
    }

    if (command.stdin && !command.stdout && !command.outputPath) {
      throw new CliUsageError("Expected --output or --stdout when reading from stdin.");
    }

    const inputPath = command.inputPath ? path.resolve(io.cwd, command.inputPath) : undefined;
    const outputPath = command.stdout
      ? undefined
      : path.resolve(io.cwd, command.outputPath ?? getDefaultOutputPath(command.inputPath ?? ""));

    if (!command.stdout) {
      await assertCanWriteOutput({
        force: command.force,
        inputPath,
        outputPath: requiredOutputPath(outputPath)
      });
    }

    const markdown = command.stdin
      ? await readStdin(io.stdin ?? Readable.from([]))
      : await readFile(requiredInputPath(inputPath), "utf8");

    if (command.stdin && !hasTitleSource(markdown, command.title)) {
      throw new CliUsageError(
        "Expected --title, front matter title, or H1 when reading from stdin."
      );
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
      return 0;
    }

    await mkdir(path.dirname(requiredOutputPath(outputPath)), { recursive: true });
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

    io.stdout.write(
      `Wrote ${path.relative(io.cwd, requiredOutputPath(outputPath)) || outputPath}\n`
    );

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const prefix = error instanceof CliUsageError ? "Usage error" : "Error";

    io.stderr.write(`${prefix}: ${message}\n`);

    if (error instanceof CliUsageError) {
      io.stderr.write(`Run "${packageName} --help" for usage.\n`);
    }

    return 1;
  }
}

export function getHelpText(): string {
  return `${packageName}

Usage:
  ${packageName} <input.md> [--output output.html] [--title "Document Title"]
  ${packageName} --stdin --stdout [--title "Document Title"]

Options:
      --css <path>     Append a custom CSS file to the default document styles.
      --force          Overwrite an existing output file.
      --margin <value> Print page margin, for example "0.75in" or "18mm".
      --no-toc         Disable automatic table of contents rendering.
  -o, --output <path>  HTML output path. Defaults to input filename with .html extension.
      --page-size <v>  Print page size, for example "letter", "A4", or "A4 landscape".
      --stdin          Read Markdown input from stdin instead of a file.
      --stdout         Write generated HTML to stdout instead of a file.
      --title <title>  Override the document title.
  -h, --help           Show this help message.
      --version        Show the current version.
`;
}

export function getDefaultOutputPath(inputPath: string): string {
  const parsedPath = path.parse(inputPath);
  return path.join(parsedPath.dir, `${parsedPath.name}.html`);
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
