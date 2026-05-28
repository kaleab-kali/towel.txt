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

  it("does not render raw HTML from Markdown input", () => {
    expect(renderMarkdown("<script>alert('xss')</script>").html).toContain(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });
});
