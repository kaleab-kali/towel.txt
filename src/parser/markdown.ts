import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

import { extractHeadings, type Heading } from "./headings.js";
import { parseMarkdownInput, type DocumentMetadata } from "./metadata.js";

export interface RenderedMarkdown {
  headings: Heading[];
  html: string;
  metadata: DocumentMetadata;
}

export function renderMarkdown(markdown: string): RenderedMarkdown {
  const parsedInput = parseMarkdownInput(markdown);
  const headings = extractHeadings(parsedInput.content).map((heading) => ({
    ...heading,
    line: heading.line + parsedInput.contentLineOffset
  }));
  const headingIds = headings.map((heading) => heading.id);
  let headingIndex = 0;

  const parser = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false
  });

  const defaultHeadingOpenRule =
    parser.renderer.rules.heading_open ??
    ((tokens: Token[], index: number, options, _environment, renderer) =>
      renderer.renderToken(tokens, index, options));

  parser.renderer.rules.heading_open = (tokens, index, options, environment, renderer) => {
    const headingId = headingIds[headingIndex];
    headingIndex += 1;

    if (headingId) {
      tokens[index].attrSet("id", headingId);
    }

    return defaultHeadingOpenRule(tokens, index, options, environment, renderer);
  };

  return {
    headings,
    html: parser.render(parsedInput.content).trimEnd(),
    metadata: parsedInput.metadata
  };
}
