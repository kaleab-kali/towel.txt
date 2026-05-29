import { describe, expect, it } from "vitest";

import { minifyHtml } from "../src/render/minify.js";

describe("minifyHtml", () => {
  it("removes formatting whitespace between HTML tags", () => {
    expect(minifyHtml("<div>\n  <span>A  B</span>\n</div>\n")).toBe("<div><span>A  B</span></div>");
  });

  it("preserves whitespace-sensitive protected blocks", () => {
    const html = [
      "<main>",
      "  <pre><code><span>first</span>",
      "<span>second</span></code></pre>",
      "  <p>Done</p>",
      "</main>"
    ].join("\n");

    expect(minifyHtml(html)).toBe(
      "<main><pre><code><span>first</span>\n<span>second</span></code></pre><p>Done</p></main>"
    );
  });
});
