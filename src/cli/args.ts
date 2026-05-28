import { parseArgs } from "node:util";

export type CliCommand =
  | { kind: "help" }
  | {
      cssPath?: string;
      inputPath?: string;
      kind: "render";
      margin?: string;
      outputPath?: string;
      pageSize?: string;
      stdout: boolean;
      stdin: boolean;
      tableOfContents: boolean;
      title?: string;
    }
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
        css: {
          type: "string"
        },
        output: {
          short: "o",
          type: "string"
        },
        margin: {
          type: "string"
        },
        "page-size": {
          type: "string"
        },
        "no-toc": {
          type: "boolean"
        },
        stdout: {
          type: "boolean"
        },
        stdin: {
          type: "boolean"
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

  if (parsed.values.stdin === true && parsed.positionals.length > 0) {
    throw new CliUsageError("Do not pass an input file when using --stdin.");
  }

  if (parsed.values.stdin !== true && parsed.positionals.length !== 1) {
    throw new CliUsageError("Expected exactly one Markdown input file.");
  }

  return {
    cssPath: getStringOption(parsed.values.css),
    ...(parsed.positionals[0] ? { inputPath: parsed.positionals[0] } : {}),
    kind: "render",
    margin: getStringOption(parsed.values.margin),
    outputPath: getStringOption(parsed.values.output),
    pageSize: getStringOption(parsed.values["page-size"]),
    stdin: parsed.values.stdin === true,
    stdout: parsed.values.stdout === true,
    tableOfContents: parsed.values["no-toc"] !== true,
    title: getStringOption(parsed.values.title)
  };
}

function getStringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
