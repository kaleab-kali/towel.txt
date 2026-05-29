import { describe, expect, it } from "vitest";

import { renderMarkdown } from "../src/parser/markdown.js";

describe("renderMarkdown", () => {
  it("renders Markdown body HTML with stable heading IDs", () => {
    expect(renderMarkdown("# Title\n\n## Title").html).toMatchInlineSnapshot(`
      "<h1 id="title">Title</h1>
      <h2 id="title-2">Title</h2>"
    `);
  });

  it("returns extracted headings alongside HTML", () => {
    const result = renderMarkdown("# Title");

    expect(result.headings).toEqual([{ id: "title", level: 1, line: 1, text: "Title" }]);
    expect(result.metadata).toEqual({});
  });

  it("strips front matter before rendering Markdown", () => {
    const result = renderMarkdown(`---
title: Front Matter Title
---
# Body Title`);

    expect(result.metadata).toEqual({ title: "Front Matter Title" });
    expect(result.headings).toEqual([{ id: "body-title", level: 1, line: 4, text: "Body Title" }]);
    expect(result.html).not.toContain("Front Matter Title");
    expect(result.html).toContain('<h1 id="body-title">Body Title</h1>');
  });

  it("renders common document Markdown features", () => {
    const result = renderMarkdown(`Paragraph with **strong text**.

> Quote

| Item | Count |
| --- | ---: |
| Pages | 3 |

\`\`\`ts
const answer = 42;
\`\`\``);

    expect(result.html).toContain("<strong>strong text</strong>");
    expect(result.html).toContain("<blockquote>");
    expect(result.html).toContain("<table>");
    expect(result.html).toContain('<code class="language-ts">');
    expect(result.html).toContain('<span class="syntax-keyword">const</span>');
    expect(result.html).toContain('<span class="syntax-number">42</span>');
  });

  it("renders footnote references and definitions", () => {
    const result = renderMarkdown(`Paragraph with a footnote[^later] and another[^first].

[^first]: First **note**.
[^later]: Later note.`);

    expect(result.html).toContain(
      '<sup class="footnote-ref"><a id="fnref-1" href="#fn-1" aria-label="Footnote 1">1</a></sup>'
    );
    expect(result.html).toContain(
      '<sup class="footnote-ref"><a id="fnref-2" href="#fn-2" aria-label="Footnote 2">2</a></sup>'
    );
    expect(result.html.indexOf('id="fn-1"')).toBeLessThan(result.html.indexOf('id="fn-2"'));
    expect(result.html).toContain('<section class="footnotes" aria-label="Footnotes">');
    expect(result.html).toContain("<p>Later note.");
    expect(result.html).toContain("<p>First <strong>note</strong>.");
    expect(result.html).not.toContain("[^first]:");
    expect(result.html).not.toContain("[^later]:");
  });

  it("keeps undefined footnote references as text", () => {
    expect(renderMarkdown("Missing reference[^unknown].").html).toContain(
      "Missing reference[^unknown]."
    );
  });

  it("adds a backlink for each repeated footnote reference", () => {
    const result = renderMarkdown(`Repeat[^same] and repeat again[^same].

[^same]: Shared note.`);

    expect(result.html).toContain('id="fnref-1"');
    expect(result.html).toContain('id="fnref-1-2"');
    expect(result.html).toContain('href="#fnref-1"');
    expect(result.html).toContain('href="#fnref-1-2"');
  });

  it("renders indented multi-line footnote definitions", () => {
    const result = renderMarkdown(`Paragraph[^note].

  [^note]: First line
    continued with **Markdown**.`);

    expect(result.html).toContain("First line");
    expect(result.html).toContain("continued with <strong>Markdown</strong>.");
    expect(result.html).not.toContain("[^note]:");
  });

  it("renders explicit page break markers", () => {
    const result = renderMarkdown(`Before.

[[page-break]]

After.

\\newpage

Done.`);

    expect(result.html).toContain("<p>Before.</p>");
    expect(result.html).toContain('<div class="page-break" aria-hidden="true"></div>');
    expect(result.html.match(/class="page-break"/g)).toHaveLength(2);
  });

  it("keeps page break markers inside code fences as code", () => {
    const result = renderMarkdown(`\`\`\`md
[[page-break]]
\`\`\``);

    expect(result.html).toContain("[[page-break]]");
    expect(result.html).not.toContain('class="page-break"');
  });

  it("does not render raw HTML from Markdown input", () => {
    expect(renderMarkdown("<script>alert('xss')</script>").html).toContain(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });
});
