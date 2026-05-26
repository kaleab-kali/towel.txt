import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

import { parseMarkdownInput } from "./metadata.js";

const markdownParser = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false
});

export function extractLocalImageSources(markdown: string): string[] {
  const parsedInput = parseMarkdownInput(markdown);
  const tokens = markdownParser.parse(parsedInput.content, {});
  const sources = new Set<string>();

  collectImageSources(tokens, sources);

  return [...sources];
}

function collectImageSources(tokens: Token[], sources: Set<string>): void {
  tokens.forEach((token) => {
    if (token.type === "image") {
      const source = token.attrGet("src");

      if (source && isSafeRelativeImageSource(source)) {
        sources.add(source);
      }
    }

    if (token.children) {
      collectImageSources(token.children, sources);
    }
  });
}

function isSafeRelativeImageSource(source: string): boolean {
  if (
    source === "" ||
    source.startsWith("#") ||
    source.includes("?") ||
    source.includes("#") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(source) ||
    source.startsWith("/") ||
    source.startsWith("\\")
  ) {
    return false;
  }

  const normalizedSource = source.replace(/\\/g, "/");
  const parts = normalizedSource.split("/");

  return !parts.includes("..") && !parts.includes("");
}
