import { describe, expect, it } from "vitest";

import { renderDocument } from "../src/render/document.js";

describe("renderDocument", () => {
  it("renders a complete printable HTML document", () => {
    const html = renderDocument("# Project Brief\n\n## Summary\n\nMarkdown content.");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Project Brief</title>");
    expect(html).toContain('<main class="document">');
    expect(html).toContain('<nav class="toc" aria-label="Table of contents">');
    expect(html).toContain('<article class="content">');
    expect(html).toContain("@media print");
    expect(html).toContain('<h2 id="summary">Summary</h2>');
  });

  it("uses an explicit title when provided", () => {
    const html = renderDocument("# Internal Heading", { title: "Public Title" });

    expect(html).toContain("<title>Public Title</title>");
    expect(html).toContain('<h1 class="document-title">Public Title</h1>');
  });

  it("escapes the document title", () => {
    const html = renderDocument("", { title: "Research & <Notes>" });

    expect(html).toContain("<title>Research &amp; &lt;Notes&gt;</title>");
    expect(html).toContain("Research &amp; &lt;Notes&gt;");
  });

  it("omits table of contents markup when the document has no headings", () => {
    const html = renderDocument("Plain paragraph.");

    expect(html).not.toContain('class="toc"');
  });
});
