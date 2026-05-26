import { renderMarkdown } from "../parser/markdown.js";
import { defaultDocumentStyles } from "../theme/default.js";
import { renderTableOfContents } from "./toc.js";

export interface RenderDocumentOptions {
  title?: string;
}

export function renderDocument(markdown: string, options: RenderDocumentOptions = {}): string {
  const renderedMarkdown = renderMarkdown(markdown);
  const title =
    options.title ?? inferDocumentTitle(renderedMarkdown.headings) ?? "Untitled Document";
  const toc = renderTableOfContents(renderedMarkdown.headings);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${indent(defaultDocumentStyles, 4)}
  </style>
</head>
<body>
  <main class="document">
    <h1 class="document-title">${escapeHtml(title)}</h1>
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
