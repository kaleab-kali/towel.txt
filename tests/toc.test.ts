import { describe, expect, it } from "vitest";

import { extractHeadings } from "../src/parser/headings.js";
import { buildTableOfContents, renderTableOfContents } from "../src/render/toc.js";

describe("buildTableOfContents", () => {
  it("builds a nested heading tree", () => {
    const headings = extractHeadings(`# Title
## Setup
### Install
## Usage
### CLI
#### Options
# Appendix`);

    expect(buildTableOfContents(headings)).toEqual([
      {
        heading: { id: "title", level: 1, line: 1, text: "Title" },
        children: [
          {
            heading: { id: "setup", level: 2, line: 2, text: "Setup" },
            children: [
              { heading: { id: "install", level: 3, line: 3, text: "Install" }, children: [] }
            ]
          },
          {
            heading: { id: "usage", level: 2, line: 4, text: "Usage" },
            children: [
              {
                heading: { id: "cli", level: 3, line: 5, text: "CLI" },
                children: [
                  { heading: { id: "options", level: 4, line: 6, text: "Options" }, children: [] }
                ]
              }
            ]
          }
        ]
      },
      {
        heading: { id: "appendix", level: 1, line: 7, text: "Appendix" },
        children: []
      }
    ]);
  });

  it("handles skipped heading levels without adding fake parents", () => {
    const headings = extractHeadings("# Title\n### Deep Start");

    expect(buildTableOfContents(headings)).toEqual([
      {
        heading: { id: "title", level: 1, line: 1, text: "Title" },
        children: [
          { heading: { id: "deep-start", level: 3, line: 2, text: "Deep Start" }, children: [] }
        ]
      }
    ]);
  });
});

describe("renderTableOfContents", () => {
  it("renders accessible nested navigation", () => {
    const headings = extractHeadings("# Title\n## Usage");

    expect(renderTableOfContents(headings)).toMatchInlineSnapshot(`
      "<nav class="toc" aria-label="Table of contents">
        <h2>Contents</h2>
        <ol>
          <li>
            <a href="#title">Title</a>
            <ol>
              <li><a href="#usage">Usage</a></li>
            </ol>
          </li>
        </ol>
      </nav>"
    `);
  });

  it("escapes heading text before rendering HTML", () => {
    const headings = extractHeadings("# Research & <Notes>");

    expect(renderTableOfContents(headings)).toContain("Research &amp; &lt;Notes&gt;");
  });

  it("returns an empty string when there are no headings", () => {
    expect(renderTableOfContents([])).toBe("");
  });
});
