import { parseArgs } from "node:util";

export type CliCommand =
  | { kind: "help" }
  | { kind: "render"; inputPath: string; outputPath?: string; title?: string }
  | { kind: "version" };

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function parseCliArgs(argv: string[]): CliCommand {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      allowPositionals: true,
      args: argv,
      options: {
        help: {
          short: "h",
          type: "boolean"
        },
        output: {
          short: "o",
          type: "string"
        },
        title: {
          type: "string"
        },
        version: {
          type: "boolean"
        }
      },
      strict: true
    });
  } catch (error) {
    throw new CliUsageError(error instanceof Error ? error.message : "Invalid arguments.");
  }

  if (parsed.values.help) {
    return { kind: "help" };
  }

  if (parsed.values.version) {
    return { kind: "version" };
  }

  if (parsed.positionals.length !== 1) {
    throw new CliUsageError("Expected exactly one Markdown input file.");
  }

  return {
    inputPath: parsed.positionals[0],
    kind: "render",
    outputPath: getStringOption(parsed.values.output),
    title: getStringOption(parsed.values.title)
  };
}

function getStringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
