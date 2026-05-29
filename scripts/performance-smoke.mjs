import { performance } from "node:perf_hooks";

import { renderDocument } from "../dist/index.js";

const maxRenderMilliseconds = Number(process.env.TOWEL_TXT_PERF_MAX_MS ?? "5000");
const markdown = createLargeDocument();
const start = performance.now();
const html = renderDocument(markdown, {
  includeTableOfContents: true,
  pageSize: "A4",
  margin: "18mm",
  theme: "report"
});
const elapsedMilliseconds = performance.now() - start;

if (!html.includes('<nav class="toc"')) {
  throw new Error("Performance smoke failed: expected table of contents output.");
}

if (!html.includes('<section class="footnotes" aria-label="Footnotes">')) {
  throw new Error("Performance smoke failed: expected footnotes output.");
}

if (!html.includes('class="syntax-keyword"') || !html.includes("example1")) {
  throw new Error("Performance smoke failed: expected highlighted code fence output.");
}

if (elapsedMilliseconds > maxRenderMilliseconds) {
  throw new Error(
    `Performance smoke failed: render took ${elapsedMilliseconds.toFixed(
      1
    )}ms, budget is ${maxRenderMilliseconds}ms.`
  );
}

process.stdout.write(
  `Performance smoke passed in ${elapsedMilliseconds.toFixed(1)}ms (${html.length} bytes).\n`
);

function createLargeDocument() {
  const sections = Array.from({ length: 160 }, (_, index) => {
    const section = index + 1;

    return [
      `## Section ${section}`,
      "",
      "This section exercises heading extraction, table of contents rendering, paragraphs, tables, code fences, and footnotes.",
      "",
      "| Area | Status | Notes |",
      "| --- | --- | --- |",
      `| Render ${section} | Ready | Keeps output deterministic. |`,
      `| Assets ${section} | Ready | Local image handling is covered elsewhere. |`,
      "",
      "```ts",
      `function example${section}(value: string): string {`,
      "  return `${value}-ready`;",
      "}",
      "```",
      "",
      `Reference note for this section.[^note-${section}]`,
      "",
      `[^note-${section}]: Performance smoke footnote ${section}.`
    ].join("\n");
  });

  return [
    "---",
    "title: Performance Smoke",
    "author: Towel.txt contributors",
    "date: 2026-05-30",
    "---",
    "",
    "# Performance Smoke",
    "",
    "This synthetic document keeps the render path large enough to catch obvious regressions.",
    "",
    ...sections
  ].join("\n");
}
