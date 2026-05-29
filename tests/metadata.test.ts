import { describe, expect, it } from "vitest";

import { MetadataParseError, parseMarkdownInput } from "../src/parser/metadata.js";

describe("parseMarkdownInput", () => {
  it("extracts supported front matter metadata and content", () => {
    expect(
      parseMarkdownInput(`---
title: Project Brief
subtitle: Quarterly plan
author: Kaleab
cover: true
date: 2026-05-27
---
# Heading`)
    ).toEqual({
      content: "# Heading",
      contentLineOffset: 7,
      metadata: {
        author: "Kaleab",
        cover: true,
        date: "2026-05-27",
        subtitle: "Quarterly plan",
        title: "Project Brief"
      }
    });
  });

  it("returns unchanged content when front matter is absent", () => {
    expect(parseMarkdownInput("# Heading")).toEqual({
      content: "# Heading",
      contentLineOffset: 0,
      metadata: {}
    });
  });

  it("ignores non-scalar supported metadata fields", () => {
    expect(
      parseMarkdownInput(`---
title:
  nested: value
---
Body`)
    ).toEqual({
      content: "Body",
      contentLineOffset: 4,
      metadata: {}
    });
  });

  it("throws a clear error when front matter is not a mapping", () => {
    expect(() =>
      parseMarkdownInput(`---
- title
---
Body`)
    ).toThrow(MetadataParseError);
  });
});
