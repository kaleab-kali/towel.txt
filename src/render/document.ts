import { renderMarkdown } from "../parser/markdown.js";
import { getThemeStyles, type ThemeName } from "../theme/themes.js";
import { renderPrintPageStyles, type PrintPageOptions } from "./print-options.js";
import { renderTableOfContents } from "./toc.js";

export interface RenderDocumentOptions extends PrintPageOptions {
  cover?: boolean;
  includeTableOfContents?: boolean;
  styles?: string;
  subtitle?: string;
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
  const subtitle = options.subtitle ?? renderedMarkdown.metadata.subtitle;
  const includeCover = options.cover ?? renderedMarkdown.metadata.cover ?? false;
  const metadata = renderMetadata(renderedMarkdown.metadata);
  const toc =
    options.includeTableOfContents === false
      ? ""
      : renderTableOfContents(renderedMarkdown.headings);
  const cover = includeCover
    ? renderCoverPage({
        author: renderedMarkdown.metadata.author,
        date: renderedMarkdown.metadata.date,
        subtitle,
        title
      })
    : "";

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
${cover ? indent(cover, 4) : `    <h1 class="document-title">${escapeHtml(title)}</h1>`}
${!cover && metadata ? indent(metadata, 4) : ""}
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

function renderCoverPage({
  author,
  date,
  subtitle,
  title
}: {
  author?: string;
  date?: string;
  subtitle?: string;
  title: string;
}): string {
  const metadata = renderCoverMetadata({ author, date });

  return `<section class="cover-page" aria-label="Cover page">
  <div class="cover-page-content">
    <h1 class="cover-page-title">${escapeHtml(title)}</h1>
${subtitle ? `    <p class="cover-page-subtitle">${escapeHtml(subtitle)}</p>\n` : ""}${metadata ? indent(metadata, 4) : ""}
  </div>
</section>`;
}

function renderCoverMetadata(metadata: { author?: string; date?: string }): string {
  const items = [
    metadata.author ? `<span>${escapeHtml(metadata.author)}</span>` : undefined,
    metadata.date ? `<span>${escapeHtml(metadata.date)}</span>` : undefined
  ].filter((item): item is string => Boolean(item));

  if (items.length === 0) {
    return "";
  }

  return `<p class="cover-page-meta">${items.join(" ")}</p>`;
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
