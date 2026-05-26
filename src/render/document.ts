import { renderMarkdown } from "../parser/markdown.js";
import { defaultDocumentStyles } from "../theme/default.js";
import { renderTableOfContents } from "./toc.js";

export interface RenderDocumentOptions {
  styles?: string;
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
  const toc = renderTableOfContents(renderedMarkdown.headings);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${indent(getDocumentStyles(options.styles), 4)}
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

function getDocumentStyles(customStyles: string | undefined): string {
  if (!customStyles?.trim()) {
    return defaultDocumentStyles;
  }

  return `${defaultDocumentStyles}

${customStyles.trim()}`;
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
