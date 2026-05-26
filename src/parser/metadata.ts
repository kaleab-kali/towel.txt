import { parse } from "yaml";

export interface DocumentMetadata {
  author?: string;
  date?: string;
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
    date: getScalarString(value.date),
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
