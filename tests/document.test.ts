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

  it("uses front matter title and renders document metadata", () => {
    const html = renderDocument(`---
title: Metadata Title
author: Kaleab
date: 2026-05-27
---
# Body Title`);

    expect(html).toContain("<title>Metadata Title</title>");
    expect(html).toContain('<h1 class="document-title">Metadata Title</h1>');
    expect(html).toContain(
      '<p class="document-meta"><span>By Kaleab</span> <span>2026-05-27</span></p>'
    );
  });

  it("escapes the document title", () => {
    const html = renderDocument("", { title: "Research & <Notes>" });

    expect(html).toContain("<title>Research &amp; &lt;Notes&gt;</title>");
    expect(html).toContain("Research &amp; &lt;Notes&gt;");
  });

  it("appends custom styles after default document styles", () => {
    const html = renderDocument("# Styled", {
      styles: ".document-title { color: rebeccapurple; }"
    });

    expect(html).toContain(".document-title { color: rebeccapurple; }");
    expect(html.indexOf("@media print")).toBeLessThan(
      html.indexOf(".document-title { color: rebeccapurple; }")
    );
  });

  it("adds print page size and margin overrides", () => {
    const html = renderDocument("# Print", {
      margin: "18mm",
      pageSize: "A4 landscape"
    });

    expect(html).toContain(`@media print {
      @page {
        size: A4 landscape;
        margin: 18mm;
      }
    }`);
  });

  it("omits table of contents markup when the document has no headings", () => {
    const html = renderDocument("Plain paragraph.");

    expect(html).not.toContain('class="toc"');
  });
});
