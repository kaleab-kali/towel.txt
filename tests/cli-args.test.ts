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
        "18mm",
        "--no-toc",
        "--stdout",
        "--force"
      ])
    ).toEqual({
      cssPath: "theme.css",
      force: true,
      inputPath: "doc.md",
      kind: "render",
      margin: "18mm",
      outputPath: "dist/doc.html",
      pageSize: "A4 landscape",
      stdin: false,
      stdout: true,
      tableOfContents: false,
      title: "Doc"
    });
  });

  it("enables table of contents by default", () => {
    expect(parseCliArgs(["doc.md"])).toEqual({
      force: false,
      inputPath: "doc.md",
      kind: "render",
      stdin: false,
      stdout: false,
      tableOfContents: true
    });
  });

  it("parses stdin mode without an input path", () => {
    expect(parseCliArgs(["--stdin", "--stdout", "--title", "Piped"])).toEqual({
      force: false,
      kind: "render",
      stdin: true,
      stdout: true,
      tableOfContents: true,
      title: "Piped"
    });
  });

  it("fails when stdin mode is combined with an input file", () => {
    expect(() => parseCliArgs(["document.md", "--stdin"])).toThrow(CliUsageError);
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
