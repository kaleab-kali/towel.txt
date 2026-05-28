import { renderMarkdown } from "../parser/markdown.js";
import { getThemeStyles, type ThemeName } from "../theme/themes.js";
import { renderPrintPageStyles, type PrintPageOptions } from "./print-options.js";
import { renderTableOfContents } from "./toc.js";

export interface RenderDocumentOptions extends PrintPageOptions {
  includeTableOfContents?: boolean;
  styles?: string;
  theme?: ThemeName;
  title?: string;
}

export function renderDocument(markdown: string, options: RenderDocumentOptions = {}): string {
  const renderedMarkdown = renderMarkdown(markdown);
  const title =
    options.title ??
    renderedMarkdown.metadata.title ??
    inferDocumentTitle(renderedMarkdown.headings) ??
    "Untitled Document";
  const metadata = renderMetadata(renderedMarkdown.metadata);
  const toc =
    options.includeTableOfContents === false
      ? ""
      : renderTableOfContents(renderedMarkdown.headings);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${indent(getDocumentStyles(options), 4)}
  </style>
</head>
<body>
  <main class="document">
    <h1 class="document-title">${escapeHtml(title)}</h1>
${metadata ? indent(metadata, 4) : ""}
${toc ? indent(toc, 4) : ""}
    <article class="content">
${indent(renderedMarkdown.html, 6)}
    </article>
  </main>
</body>
</html>
`;
}

function inferDocumentTitle(headings: { level: number; text: string }[]): string | undefined {
  return headings.find((heading) => heading.level === 1)?.text;
}

function getDocumentStyles(options: RenderDocumentOptions): string {
  const styleBlocks = [
    getThemeStyles(options.theme),
    renderPrintPageStyles(options),
    options.styles?.trim()
  ].filter((styleBlock): styleBlock is string => Boolean(styleBlock));

  return styleBlocks.join("\n\n");
}

function renderMetadata(metadata: { author?: string; date?: string }): string {
  const items = [
    metadata.author ? `<span>By ${escapeHtml(metadata.author)}</span>` : undefined,
    metadata.date ? `<span>${escapeHtml(metadata.date)}</span>` : undefined
  ].filter((item): item is string => Boolean(item));

  if (items.length === 0) {
    return "";
  }

  return `<p class="document-meta">${items.join(" ")}</p>`;
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
