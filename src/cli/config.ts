import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import { CliUsageError, type OutputFormat } from "./args.js";
import { isThemeName, type ThemeName } from "../theme/themes.js";

export interface CliConfigDefaults {
  assetDirectory?: string;
  browserPath?: string;
  cover?: boolean;
  cssPath?: string;
  format?: OutputFormat;
  margin?: string;
  outputPath?: string;
  pageSize?: string;
  subtitle?: string;
  tableOfContents?: boolean;
  theme?: ThemeName;
  title?: string;
}

export interface LoadedCliConfig {
  defaults: CliConfigDefaults;
  path: string;
}

const defaultConfigFilenames = [
  "towel-txt.config.yaml",
  "towel-txt.config.yml",
  "towel-txt.config.json"
];
const supportedFields = new Set([
  "assetDir",
  "browser",
  "cover",
  "css",
  "format",
  "margin",
  "output",
  "pageSize",
  "subtitle",
  "tableOfContents",
  "theme",
  "title"
]);

export async function loadCliConfig({
  configPath,
  cwd,
  noConfig
}: {
  configPath: string | undefined;
  cwd: string;
  noConfig: boolean;
}): Promise<LoadedCliConfig | undefined> {
  if (configPath && noConfig) {
    throw new CliUsageError("Do not pass --config with --no-config.");
  }

  if (noConfig) {
    return undefined;
  }

  const resolvedConfigPath = configPath
    ? path.resolve(cwd, configPath)
    : await findDefaultConfig(cwd);

  if (!resolvedConfigPath) {
    return undefined;
  }

  const rawConfig = await readConfigFile(resolvedConfigPath);

  return {
    defaults: normalizeConfig(rawConfig, path.dirname(resolvedConfigPath)),
    path: resolvedConfigPath
  };
}

function normalizeConfig(value: unknown, configDirectory: string): CliConfigDefaults {
  if (!isPlainRecord(value)) {
    throw new CliUsageError("Config file must contain a mapping.");
  }

  const unknownFields = Object.keys(value).filter((field) => !supportedFields.has(field));

  if (unknownFields.length > 0) {
    throw new CliUsageError(`Unsupported config field: ${unknownFields.join(", ")}.`);
  }

  return {
    assetDirectory: getOptionalAssetDirectory(value.assetDir, "assetDir"),
    browserPath: getOptionalPath(value.browser, configDirectory, {
      allowBareCommand: true,
      fieldName: "browser"
    }),
    cover: getOptionalBoolean(value.cover, "cover"),
    cssPath: getOptionalPath(value.css, configDirectory, {
      allowBareCommand: false,
      fieldName: "css"
    }),
    format: getOptionalFormat(value.format),
    margin: getOptionalString(value.margin, "margin"),
    outputPath: getOptionalPath(value.output, configDirectory, {
      allowBareCommand: false,
      fieldName: "output"
    }),
    pageSize: getOptionalString(value.pageSize, "pageSize"),
    subtitle: getOptionalString(value.subtitle, "subtitle"),
    tableOfContents: getOptionalBoolean(value.tableOfContents, "tableOfContents"),
    theme: getOptionalTheme(value.theme),
    title: getOptionalString(value.title, "title")
  };
}

function getOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  throw new CliUsageError(`Config field "${fieldName}" must be a string.`);
}

function getOptionalAssetDirectory(value: unknown, fieldName: string): string | undefined {
  const directory = getOptionalString(value, fieldName)?.trim();

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
    throw new CliUsageError(`Config field "${fieldName}" must be a safe relative directory.`);
  }

  const normalizedDirectory = directory.replace(/\\/g, "/");
  const parts = normalizedDirectory.split("/");

  if (parts.includes("..") || parts.includes("")) {
    throw new CliUsageError(`Config field "${fieldName}" must be a safe relative directory.`);
  }

  return normalizedDirectory;
}

function getOptionalPath(
  value: unknown,
  configDirectory: string,
  {
    allowBareCommand,
    fieldName
  }: {
    allowBareCommand: boolean;
    fieldName: string;
  }
): string | undefined {
  const configValue = getOptionalString(value, fieldName);

  if (!configValue) {
    return undefined;
  }

  if (path.isAbsolute(configValue) || (allowBareCommand && isBareCommand(configValue))) {
    return configValue;
  }

  return path.resolve(configDirectory, configValue);
}

function getOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  throw new CliUsageError(`Config field "${fieldName}" must be a boolean.`);
}

function getOptionalFormat(value: unknown): OutputFormat | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === "html" || value === "pdf") {
    return value;
  }

  throw new CliUsageError('Config field "format" must be "html" or "pdf".');
}

function getOptionalTheme(value: unknown): ThemeName | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (isThemeName(value)) {
    return value;
  }

  throw new CliUsageError('Config field "theme" must be "default", "compact", or "report".');
}

async function readConfigFile(configPath: string): Promise<unknown> {
  let content: string;

  try {
    content = await readFile(configPath, "utf8");
  } catch (error) {
    if (isFileNotFound(error)) {
      throw new CliUsageError(`Config file not found: ${configPath}.`);
    }

    throw error;
  }

  try {
    return parseYaml(content) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid config file.";
    throw new CliUsageError(`Invalid config file: ${message}`);
  }
}

async function findDefaultConfig(cwd: string): Promise<string | undefined> {
  for (const filename of defaultConfigFilenames) {
    const candidate = path.resolve(cwd, filename);

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    if (isFileNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function isFileNotFound(error: unknown): boolean {
  const code = error instanceof Error && "code" in error ? error.code : undefined;

  return code === "ENOENT" || code === "ENOTDIR";
}

function isBareCommand(value: string): boolean {
  return !value.includes("/") && !value.includes("\\");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
