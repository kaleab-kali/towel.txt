import { describe, expect, it } from "vitest";

import { highlightCode } from "../src/parser/highlight.js";

describe("highlightCode", () => {
  it("highlights JavaScript-like code with escaped token content", () => {
    const html = highlightCode('const label = "<safe>"; // note', "ts");

    expect(html).toContain('<span class="syntax-keyword">const</span>');
    expect(html).toContain('<span class="syntax-string">"&lt;safe&gt;"</span>');
    expect(html).toContain('<span class="syntax-comment">// note</span>');
  });

  it("uses the first word of a code fence info string as the language", () => {
    const html = highlightCode("const answer = 42;", "ts title=example");

    expect(html).toContain('<span class="syntax-keyword">const</span>');
    expect(html).toContain('<span class="syntax-number">42</span>');
  });

  it("highlights JSON literals", () => {
    const html = highlightCode('{"enabled": true, "count": 3}', "json");

    expect(html).toContain('<span class="syntax-string">"enabled"</span>');
    expect(html).toContain('<span class="syntax-literal">true</span>');
    expect(html).toContain('<span class="syntax-number">3</span>');
  });

  it("highlights shell commands and flags", () => {
    const html = highlightCode("pnpm test --filter web # run tests", "bash");

    expect(html).toContain('<span class="syntax-command">pnpm</span>');
    expect(html).toContain('<span class="syntax-flag">--filter</span>');
    expect(html).toContain('<span class="syntax-comment"># run tests</span>');
  });

  it("escapes unsupported languages without adding spans", () => {
    expect(highlightCode("<script>alert('xss')</script>", "unknown")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });
});
