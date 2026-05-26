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
    expect(renderMarkdown("# Title").headings).toEqual([
      { id: "title", level: 1, line: 1, text: "Title" }
    ]);
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
  });

  it("does not render raw HTML from Markdown input", () => {
    expect(renderMarkdown("<script>alert('xss')</script>").html).toContain(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });
});
