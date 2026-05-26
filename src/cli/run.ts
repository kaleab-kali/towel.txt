import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { packageName, packageVersion } from "../meta.js";
import { renderDocument } from "../render/document.js";
import { CliUsageError, parseCliArgs } from "./args.js";
import { copyLocalImageAssets } from "./assets.js";

export interface CliIo {
  cwd: string;
  stderr: Pick<NodeJS.WriteStream, "write">;
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

    const inputPath = path.resolve(io.cwd, command.inputPath);
    const outputPath = path.resolve(
      io.cwd,
      command.outputPath ?? getDefaultOutputPath(command.inputPath)
    );
    const markdown = await readFile(inputPath, "utf8");
    const styles = command.cssPath
      ? await readFile(path.resolve(io.cwd, command.cssPath), "utf8")
      : undefined;
    const html = renderDocument(markdown, {
      margin: command.margin,
      pageSize: command.pageSize,
      styles,
      title: command.title
    });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
    const imageAssets = await copyLocalImageAssets({ inputPath, markdown, outputPath });

    imageAssets.forEach((asset) => {
      if (asset.status === "missing") {
        io.stderr.write(`Warning: image asset "${asset.source}" was not copied: ${asset.error}\n`);
      }
    });

    io.stdout.write(`Wrote ${path.relative(io.cwd, outputPath) || outputPath}\n`);

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

Options:
      --css <path>     Append a custom CSS file to the default document styles.
      --margin <value> Print page margin, for example "0.75in" or "18mm".
  -o, --output <path>  HTML output path. Defaults to input filename with .html extension.
      --page-size <v>  Print page size, for example "letter", "A4", or "A4 landscape".
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
    stdout: process.stdout
  };
}
