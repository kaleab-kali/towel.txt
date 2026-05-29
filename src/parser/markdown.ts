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
import { registerPageBreakRule } from "./page-breaks.js";

export interface RenderedMarkdown {
  headings: Heading[];
  html: string;
  metadata: DocumentMetadata;
}

export interface RenderMarkdownOptions {
  imageSourceMap?: Map<string, string>;
}

export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {}
): RenderedMarkdown {
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
  registerPageBreakRule(parser);

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

  const defaultImageRule =
    parser.renderer.rules.image ??
    ((tokens: Token[], index: number, options, environment, renderer) =>
      renderer.renderToken(tokens, index, options));

  parser.renderer.rules.image = (tokens, index, parserOptions, environment, renderer) => {
    const source = tokens[index].attrGet("src");
    const targetSource = source ? getMappedImageSource(source, options.imageSourceMap) : undefined;

    if (targetSource) {
      tokens[index].attrSet("src", targetSource);
    }

    return defaultImageRule(tokens, index, parserOptions, environment, renderer);
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

function getMappedImageSource(
  source: string,
  imageSourceMap: Map<string, string> | undefined
): string | undefined {
  return imageSourceMap?.get(source) ?? imageSourceMap?.get(source.replace(/\\/g, "/"));
}
