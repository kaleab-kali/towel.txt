import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

import {
  createFootnoteEnvironment,
  extractFootnotes,
  registerFootnoteRules,
  renderFootnotes
} from "./footnotes.js";
import { extractHeadings, type Heading } from "./headings.js";
import { highlightCode } from "./highlight.js";
import { parseMarkdownInput, type DocumentMetadata } from "./metadata.js";

export interface RenderedMarkdown {
  headings: Heading[];
  html: string;
  metadata: DocumentMetadata;
}

export function renderMarkdown(markdown: string): RenderedMarkdown {
  const parsedInput = parseMarkdownInput(markdown);
  const parsedFootnotes = extractFootnotes(parsedInput.content);
  const headings = extractHeadings(parsedFootnotes.content).map((heading) => ({
    ...heading,
    line: heading.line + parsedInput.contentLineOffset
  }));
  const headingIds = headings.map((heading) => heading.id);
  let headingIndex = 0;

  const parser = new MarkdownIt({
    highlight: highlightCode,
    html: false,
    linkify: false,
    typographer: false
  });

  registerFootnoteRules(parser);

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

  const footnoteEnvironment = createFootnoteEnvironment(parsedFootnotes.definitions);
  const renderedHtml = parser.render(parsedFootnotes.content, footnoteEnvironment).trimEnd();
  const footnotesHtml = renderFootnotes(footnoteEnvironment, (definition) =>
    parser
      .render(definition, {
        ...footnoteEnvironment,
        disableFootnotes: true
      })
      .trimEnd()
  );

  return {
    headings,
    html: [renderedHtml, footnotesHtml].filter(Boolean).join("\n"),
    metadata: parsedInput.metadata
  };
}
