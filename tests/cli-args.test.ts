import path from "node:path";

import { describe, expect, it } from "vitest";

import { CliUsageError, parseCliArgs } from "../src/cli/args.js";
import { getDefaultOutputPath } from "../src/cli/run.js";

describe("parseCliArgs", () => {
  it("parses an input path with output and title options", () => {
    expect(
      parseCliArgs([
        "doc.md",
        "--output",
        "dist/doc.html",
        "--title",
        "Doc",
        "--css",
        "theme.css",
        "--page-size",
        "A4 landscape",
        "--margin",
        "18mm"
      ])
    ).toEqual({
      cssPath: "theme.css",
      inputPath: "doc.md",
      kind: "render",
      margin: "18mm",
      outputPath: "dist/doc.html",
      pageSize: "A4 landscape",
      title: "Doc"
    });
  });

  it("parses help and version commands", () => {
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["--version"])).toEqual({ kind: "version" });
  });

  it("fails when no input file is provided", () => {
    expect(() => parseCliArgs([])).toThrow(CliUsageError);
  });
});

describe("getDefaultOutputPath", () => {
  it("replaces the input extension with html", () => {
    expect(getDefaultOutputPath("docs/report.md")).toBe(path.join("docs", "report.html"));
  });
});
