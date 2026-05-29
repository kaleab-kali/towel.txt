import path from "node:path";

import { describe, expect, it } from "vitest";

import { CliUsageError, parseCliArgs } from "../src/cli/args.js";
import { getDefaultOutputPath } from "../src/cli/run.js";

describe("parseCliArgs", () => {
  it("parses an input path with output and title options", () => {
    expect(
      parseCliArgs([
        "doc.md",
        "--asset-dir",
        "assets",
        "--output",
        "dist/doc.html",
        "--title",
        "Doc",
        "--css",
        "theme.css",
        "--cover",
        "--subtitle",
        "Subtitle",
        "--page-size",
        "A4 landscape",
        "--margin",
        "18mm",
        "--minify",
        "--no-toc",
        "--summary-json",
        "dist/summary.json",
        "--strict",
        "--stdout",
        "--force"
      ])
    ).toEqual({
      assetDirectory: "assets",
      cssPath: "theme.css",
      cover: true,
      coverSpecified: true,
      force: true,
      inputPath: "doc.md",
      kind: "render",
      margin: "18mm",
      minify: true,
      minifySpecified: true,
      noConfig: false,
      outputPath: "dist/doc.html",
      pageSize: "A4 landscape",
      stdin: false,
      stdout: true,
      strict: true,
      strictSpecified: true,
      subtitle: "Subtitle",
      summaryJsonPath: "dist/summary.json",
      tableOfContents: false,
      tableOfContentsSpecified: true,
      title: "Doc",
      watch: false
    });
  });

  it("enables table of contents by default", () => {
    expect(parseCliArgs(["doc.md"])).toEqual({
      force: false,
      inputPath: "doc.md",
      kind: "render",
      minify: false,
      minifySpecified: false,
      noConfig: false,
      cover: false,
      coverSpecified: false,
      stdin: false,
      stdout: false,
      strict: false,
      strictSpecified: false,
      tableOfContents: true,
      tableOfContentsSpecified: false,
      watch: false
    });
  });

  it("parses stdin mode without an input path", () => {
    expect(parseCliArgs(["--stdin", "--stdout", "--title", "Piped"])).toEqual({
      force: false,
      kind: "render",
      minify: false,
      minifySpecified: false,
      noConfig: false,
      cover: false,
      coverSpecified: false,
      stdin: true,
      stdout: true,
      strict: false,
      strictSpecified: false,
      tableOfContents: true,
      tableOfContentsSpecified: false,
      title: "Piped",
      watch: false
    });
  });

  it("parses PDF output options", () => {
    expect(parseCliArgs(["doc.md", "--format", "pdf", "--browser", "chrome"])).toEqual({
      browserPath: "chrome",
      cover: false,
      coverSpecified: false,
      force: false,
      format: "pdf",
      inputPath: "doc.md",
      kind: "render",
      minify: false,
      minifySpecified: false,
      noConfig: false,
      stdin: false,
      stdout: false,
      strict: false,
      strictSpecified: false,
      tableOfContents: true,
      tableOfContentsSpecified: false,
      watch: false
    });
  });

  it("parses config options", () => {
    expect(parseCliArgs(["doc.md", "--config", "towel-txt.config.yaml", "--no-config"])).toEqual({
      configPath: "towel-txt.config.yaml",
      cover: false,
      coverSpecified: false,
      force: false,
      inputPath: "doc.md",
      kind: "render",
      minify: false,
      minifySpecified: false,
      noConfig: true,
      stdin: false,
      stdout: false,
      strict: false,
      strictSpecified: false,
      tableOfContents: true,
      tableOfContentsSpecified: false,
      watch: false
    });
  });

  it("parses watch mode", () => {
    expect(parseCliArgs(["doc.md", "--watch"])).toEqual({
      force: false,
      inputPath: "doc.md",
      kind: "render",
      minify: false,
      minifySpecified: false,
      noConfig: false,
      cover: false,
      coverSpecified: false,
      stdin: false,
      stdout: false,
      strict: false,
      strictSpecified: false,
      tableOfContents: true,
      tableOfContentsSpecified: false,
      watch: true
    });
  });

  it("parses an explicit table of contents enablement", () => {
    expect(parseCliArgs(["doc.md", "--toc"])).toMatchObject({
      tableOfContents: true,
      tableOfContentsSpecified: true
    });
  });

  it("parses an explicit minify disablement", () => {
    expect(parseCliArgs(["doc.md", "--no-minify"])).toMatchObject({
      minify: false,
      minifySpecified: true
    });
  });

  it("parses an explicit strict mode disablement", () => {
    expect(parseCliArgs(["doc.md", "--no-strict"])).toMatchObject({
      strict: false,
      strictSpecified: true
    });
  });

  it("normalizes Windows separators in asset directory options", () => {
    expect(parseCliArgs(["doc.md", "--asset-dir", "assets\\images"])).toMatchObject({
      assetDirectory: "assets/images"
    });
  });

  it("parses an explicit cover page disablement", () => {
    expect(parseCliArgs(["doc.md", "--no-cover"])).toMatchObject({
      cover: false,
      coverSpecified: true
    });
  });

  it("parses a document theme", () => {
    expect(parseCliArgs(["doc.md", "--theme", "report"])).toMatchObject({
      theme: "report"
    });
  });

  it("fails when an unsupported output format is provided", () => {
    expect(() => parseCliArgs(["doc.md", "--format", "docx"])).toThrow(CliUsageError);
  });

  it("fails when an unsafe asset directory is provided", () => {
    expect(() => parseCliArgs(["doc.md", "--asset-dir", "../assets"])).toThrow(CliUsageError);
  });

  it("fails when an unsupported theme is provided", () => {
    expect(() => parseCliArgs(["doc.md", "--theme", "minimal"])).toThrow(CliUsageError);
  });

  it("fails when table of contents flags conflict", () => {
    expect(() => parseCliArgs(["doc.md", "--toc", "--no-toc"])).toThrow(CliUsageError);
  });

  it("fails when cover page flags conflict", () => {
    expect(() => parseCliArgs(["doc.md", "--cover", "--no-cover"])).toThrow(CliUsageError);
  });

  it("fails when minify flags conflict", () => {
    expect(() => parseCliArgs(["doc.md", "--minify", "--no-minify"])).toThrow(CliUsageError);
  });

  it("fails when strict mode flags conflict", () => {
    expect(() => parseCliArgs(["doc.md", "--strict", "--no-strict"])).toThrow(CliUsageError);
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

  it("uses the requested output format extension", () => {
    expect(getDefaultOutputPath("docs/report.md", "pdf")).toBe(path.join("docs", "report.pdf"));
  });
});
