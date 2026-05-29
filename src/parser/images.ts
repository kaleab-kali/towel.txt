import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

import { parseMarkdownInput } from "./metadata.js";

const markdownParser = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false
});

export interface ImageReference {
  reason?: string;
  source: string;
  status: "local" | "skipped";
}

export function extractLocalImageSources(markdown: string): string[] {
  return extractImageReferences(markdown)
    .filter((reference) => reference.status === "local")
    .map((reference) => reference.source);
}

export function extractImageReferences(markdown: string): ImageReference[] {
  const parsedInput = parseMarkdownInput(markdown);
  const tokens = markdownParser.parse(parsedInput.content, {});
  const references = new Map<string, ImageReference>();

  collectImageReferences(tokens, references);

  return [...references.values()];
}

function collectImageReferences(tokens: Token[], references: Map<string, ImageReference>): void {
  tokens.forEach((token) => {
    if (token.type === "image") {
      const source = token.attrGet("src") ?? "";

      if (!references.has(source)) {
        const reason = getSkippedImageReason(source);
        references.set(
          source,
          reason ? { reason, source, status: "skipped" } : { source, status: "local" }
        );
      }
    }

    if (token.children) {
      collectImageReferences(token.children, references);
    }
  });
}

function getSkippedImageReason(source: string): string | undefined {
  if (source === "") {
    return "empty image source";
  }

  if (source.startsWith("#")) {
    return "fragment-only image source";
  }

  if (source.includes("?") || source.includes("#")) {
    return "image source includes a query string or fragment";
  }

  if (/^[a-z][a-z0-9+.-]*:/iu.test(source)) {
    return "remote or protocol-based image source";
  }

  if (source.startsWith("/") || source.startsWith("\\")) {
    return "absolute image path";
  }

  const normalizedSource = source.replace(/\\/g, "/");
  const parts = normalizedSource.split("/");

  if (parts.includes("..")) {
    return "parent directory traversal is not copied";
  }

  if (parts.includes("")) {
    return "empty image path segment";
  }

  return undefined;
}
