import type { Heading } from "../parser/headings.js";

export interface TocItem {
  children: TocItem[];
  heading: Heading;
}

export function buildTableOfContents(headings: Heading[]): TocItem[] {
  const roots: TocItem[] = [];
  const stack: TocItem[] = [];

  headings.forEach((heading) => {
    const item: TocItem = { children: [], heading };

    while (stack.length > 0 && stack[stack.length - 1].heading.level >= heading.level) {
      stack.pop();
    }

    const parent = stack.at(-1);

    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }

    stack.push(item);
  });

  return roots;
}

export function renderTableOfContents(headings: Heading[]): string {
  const items = buildTableOfContents(headings);

  if (items.length === 0) {
    return "";
  }

  return `<nav class="toc" aria-label="Table of contents">
  <h2>Contents</h2>
${renderTocItems(items, 1)}
</nav>`;
}

function renderTocItems(items: TocItem[], depth: number): string {
  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);
  const lines = [`${indent}<ol>`];

  items.forEach((item) => {
    const label = escapeHtml(item.heading.text);
    const href = `#${escapeHtmlAttribute(item.heading.id)}`;

    if (item.children.length === 0) {
      lines.push(`${childIndent}<li><a href="${href}">${label}</a></li>`);
      return;
    }

    lines.push(`${childIndent}<li>`);
    lines.push(`${childIndent}  <a href="${href}">${label}</a>`);
    lines.push(renderTocItems(item.children, depth + 2));
    lines.push(`${childIndent}</li>`);
  });

  lines.push(`${indent}</ol>`);

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
