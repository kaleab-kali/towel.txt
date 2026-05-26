import { describe, expect, it } from "vitest";

import { extractHeadings } from "../src/parser/headings.js";
import { createHeadingId } from "../src/utils/ids.js";

describe("createHeadingId", () => {
  it("creates stable URL-safe heading IDs", () => {
    expect(createHeadingId("Hello, Printable HTML!")).toBe("hello-printable-html");
    expect(createHeadingId("Research & Notes")).toBe("research-and-notes");
    expect(createHeadingId("")).toBe("section");
  });
});

describe("extractHeadings", () => {
  it("extracts ATX headings with levels, line numbers, text, and IDs", () => {
    const headings = extractHeadings(`# Title

Body text.

## Details

### Next Steps`);

    expect(headings).toEqual([
      { id: "title", level: 1, line: 1, text: "Title" },
      { id: "details", level: 2, line: 5, text: "Details" },
      { id: "next-steps", level: 3, line: 7, text: "Next Steps" }
    ]);
  });

  it("strips optional closing hash markers", () => {
    expect(extractHeadings("## Release Notes ##")).toEqual([
      { id: "release-notes", level: 2, line: 1, text: "Release Notes" }
    ]);
  });

  it("keeps duplicate headings addressable with unique IDs", () => {
    expect(extractHeadings("# Intro\n## Intro\n## Intro")).toEqual([
      { id: "intro", level: 1, line: 1, text: "Intro" },
      { id: "intro-2", level: 2, line: 2, text: "Intro" },
      { id: "intro-3", level: 2, line: 3, text: "Intro" }
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const headings = extractHeadings(`# Real

\`\`\`md
# Ignored
\`\`\`

~~~markdown
## Also ignored
~~~

## Visible`);

    expect(headings).toEqual([
      { id: "real", level: 1, line: 1, text: "Real" },
      { id: "visible", level: 2, line: 11, text: "Visible" }
    ]);
  });

  it("unescapes Markdown punctuation in heading text", () => {
    expect(extractHeadings(String.raw`# What\?`)).toEqual([
      { id: "what", level: 1, line: 1, text: "What?" }
    ]);
  });
});
