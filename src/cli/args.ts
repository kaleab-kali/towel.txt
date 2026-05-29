import { parseArgs } from "node:util";

import { isThemeName, type ThemeName } from "../theme/themes.js";

export type OutputFormat = "html" | "pdf";

export type CliCommand =
  | { kind: "help" }
  | {
      browserPath?: string;
      assetDirectory?: string;
      configPath?: string;
      cover: boolean;
      coverSpecified: boolean;
      cssPath?: string;
      force: boolean;
      format?: OutputFormat;
      inputPath?: string;
      kind: "render";
      margin?: string;
      minify: boolean;
      minifySpecified: boolean;
      noConfig: boolean;
      outputPath?: string;
      pageSize?: string;
      stdout: boolean;
      stdin: boolean;
      subtitle?: string;
      summaryJsonPath?: string;
      tableOfContents: boolean;
      tableOfContentsSpecified: boolean;
      theme?: ThemeName;
      title?: string;
      watch: boolean;
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
        browser: {
          type: "string"
        },
        "asset-dir": {
          type: "string"
        },
        config: {
          type: "string"
        },
        cover: {
          type: "boolean"
        },
        help: {
          short: "h",
          type: "boolean"
        },
        css: {
          type: "string"
        },
        force: {
          type: "boolean"
        },
        format: {
          type: "string"
        },
        output: {
          short: "o",
          type: "string"
        },
        margin: {
          type: "string"
        },
        minify: {
          type: "boolean"
        },
        "page-size": {
          type: "string"
        },
        "no-toc": {
          type: "boolean"
        },
        "no-config": {
          type: "boolean"
        },
        "no-cover": {
          type: "boolean"
        },
        "no-minify": {
          type: "boolean"
        },
        stdout: {
          type: "boolean"
        },
        stdin: {
          type: "boolean"
        },
        subtitle: {
          type: "string"
        },
        "summary-json": {
          type: "string"
        },
        title: {
          type: "string"
        },
        theme: {
          type: "string"
        },
        toc: {
          type: "boolean"
        },
        version: {
          type: "boolean"
        },
        watch: {
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

  if (parsed.values.toc === true && parsed.values["no-toc"] === true) {
    throw new CliUsageError("Do not pass --toc with --no-toc.");
  }

  if (parsed.values.cover === true && parsed.values["no-cover"] === true) {
    throw new CliUsageError("Do not pass --cover with --no-cover.");
  }

  if (parsed.values.minify === true && parsed.values["no-minify"] === true) {
    throw new CliUsageError("Do not pass --minify with --no-minify.");
  }

  if (parsed.values.stdin === true && parsed.positionals.length > 0) {
    throw new CliUsageError("Do not pass an input file when using --stdin.");
  }

  if (parsed.values.stdin !== true && parsed.positionals.length !== 1) {
    throw new CliUsageError("Expected exactly one Markdown input file.");
  }

  return {
    assetDirectory: getAssetDirectoryOption(parsed.values["asset-dir"], "--asset-dir"),
    browserPath: getStringOption(parsed.values.browser),
    configPath: getStringOption(parsed.values.config),
    cover: parsed.values.cover === true && parsed.values["no-cover"] !== true,
    coverSpecified: parsed.values.cover === true || parsed.values["no-cover"] === true,
    cssPath: getStringOption(parsed.values.css),
    force: parsed.values.force === true,
    format: getOutputFormatOption(parsed.values.format),
    ...(parsed.positionals[0] ? { inputPath: parsed.positionals[0] } : {}),
    kind: "render",
    margin: getStringOption(parsed.values.margin),
    minify: parsed.values.minify === true && parsed.values["no-minify"] !== true,
    minifySpecified: parsed.values.minify === true || parsed.values["no-minify"] === true,
    noConfig: parsed.values["no-config"] === true,
    outputPath: getStringOption(parsed.values.output),
    pageSize: getStringOption(parsed.values["page-size"]),
    stdin: parsed.values.stdin === true,
    stdout: parsed.values.stdout === true,
    subtitle: getStringOption(parsed.values.subtitle),
    summaryJsonPath: getStringOption(parsed.values["summary-json"]),
    tableOfContents: parsed.values["no-toc"] !== true,
    tableOfContentsSpecified: parsed.values["no-toc"] === true || parsed.values.toc === true,
    theme: getThemeOption(parsed.values.theme),
    title: getStringOption(parsed.values.title),
    watch: parsed.values.watch === true
  };
}

function getThemeOption(value: unknown): ThemeName | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (isThemeName(value)) {
    return value;
  }

  throw new CliUsageError('Expected --theme to be "default", "compact", or "report".');
}

function getStringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getAssetDirectoryOption(value: unknown, optionName: string): string | undefined {
  const directory = getStringOption(value)?.trim();

  if (!directory) {
    return undefined;
  }

  if (
    directory.includes("?") ||
    directory.includes("#") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(directory) ||
    directory.startsWith("/") ||
    directory.startsWith("\\")
  ) {
    throw new CliUsageError(`Expected ${optionName} to be a safe relative directory.`);
  }

  const normalizedDirectory = directory.replace(/\\/g, "/");
  const parts = normalizedDirectory.split("/");

  if (parts.includes("..") || parts.includes("")) {
    throw new CliUsageError(`Expected ${optionName} to be a safe relative directory.`);
  }

  return normalizedDirectory;
}

function getOutputFormatOption(value: unknown): OutputFormat | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "html" || value === "pdf") {
    return value;
  }

  throw new CliUsageError('Expected --format to be "html" or "pdf".');
}
