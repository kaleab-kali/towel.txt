import { parse } from "yaml";

export interface DocumentMetadata {
  author?: string;
  cover?: boolean;
  date?: string;
  subtitle?: string;
  title?: string;
}

export interface ParsedMarkdownInput {
  content: string;
  contentLineOffset: number;
  metadata: DocumentMetadata;
}

export class MetadataParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetadataParseError";
  }
}

const frontMatterPattern = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const stringMetadataFields = new Set(["author", "date", "subtitle", "title"]);
const supportedMetadataFields = new Set([...stringMetadataFields, "cover"]);

export function parseMarkdownInput(markdown: string): ParsedMarkdownInput {
  const match = frontMatterPattern.exec(markdown);

  if (!match) {
    return {
      content: markdown,
      contentLineOffset: 0,
      metadata: {}
    };
  }

  return {
    content: markdown.slice(match[0].length),
    contentLineOffset: countLines(match[0]),
    metadata: normalizeMetadata(parseFrontMatter(match[1]))
  };
}

export function getMetadataWarnings(markdown: string): string[] {
  const match = frontMatterPattern.exec(markdown);

  if (!match) {
    return [];
  }

  const value = parseFrontMatter(match[1]);

  if (!isPlainRecord(value)) {
    throw new MetadataParseError("Front matter must be a YAML mapping.");
  }

  const warnings: string[] = [];

  Object.keys(value)
    .filter((field) => !supportedMetadataFields.has(field))
    .forEach((field) => {
      warnings.push(`Warning: unsupported metadata field "${field}" was ignored.`);
    });

  stringMetadataFields.forEach((field) => {
    if (hasOwn(value, field) && !isStringMetadataValue(value[field])) {
      warnings.push(`Warning: metadata field "${field}" must be a string, number, or boolean.`);
    }
  });

  if (hasOwn(value, "cover") && typeof value.cover !== "boolean") {
    warnings.push('Warning: metadata field "cover" must be a boolean.');
  }

  return warnings;
}

function countLines(value: string): number {
  return value.split(/\r?\n/).length - 1;
}

function parseFrontMatter(frontMatter: string): unknown {
  try {
    return parse(frontMatter) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid front matter.";
    throw new MetadataParseError(message);
  }
}

function normalizeMetadata(value: unknown): DocumentMetadata {
  if (!isPlainRecord(value)) {
    throw new MetadataParseError("Front matter must be a YAML mapping.");
  }

  return {
    author: getScalarString(value.author),
    cover: getScalarBoolean(value.cover),
    date: getScalarString(value.date),
    subtitle: getScalarString(value.subtitle),
    title: getScalarString(value.title)
  };
}

function getScalarString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function getScalarBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isStringMetadataValue(value: unknown): boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
