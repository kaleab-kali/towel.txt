import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";

let temporaryDirectory: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "towel-txt-fixture-"));
  await cp(path.resolve("tests", "fixtures", "cli"), temporaryDirectory, { recursive: true });
});

afterEach(async () => {
  await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("CLI fixtures", () => {
  it("renders the checked-in Markdown fixture through the CLI", async () => {
    const output = createBufferedOutput();
    const errors = createBufferedOutput();

    const exitCode = await runCli(
      [
        "brief.md",
        "--output",
        "dist/brief.html",
        "--asset-dir",
        "copied-assets",
        "--css",
        "print.css",
        "--summary-json",
        "dist/summary.json",
        "--strict"
      ],
      {
        cwd: temporaryDirectory,
        stderr: errors,
        stdout: output
      }
    );

    const html = await readFile(path.join(temporaryDirectory, "dist", "brief.html"), "utf8");
    const summary = JSON.parse(
      await readFile(path.join(temporaryDirectory, "dist", "summary.json"), "utf8")
    ) as Record<string, unknown>;
    const copiedImage = await readFile(
      path.join(temporaryDirectory, "dist", "copied-assets", "images", "diagram.png"),
      "utf8"
    );

    expect(exitCode).toBe(0);
    expect(errors.value).toBe("");
    expect(output.value).toContain("Copied image asset: images/diagram.png");
    expect(output.value).toContain("Wrote ");
    expect(html).toContain("<title>Fixture Brief</title>");
    expect(html).toContain('<section class="cover-page" aria-label="Cover page">');
    expect(html).toContain('<nav class="toc" aria-label="Table of contents">');
    expect(html).toContain('src="copied-assets/images/diagram.png"');
    expect(html).toContain('<span class="syntax-keyword">const</span>');
    expect(html).toContain('<div class="page-break" aria-hidden="true"></div>');
    expect(html).toContain('<section class="footnotes" aria-label="Footnotes">');
    expect(html).toContain(".content strong");
    expect(copiedImage).toBe("fixture image bytes\n");
    expect(summary).toMatchObject({
      format: "html",
      images: [
        {
          source: "images/diagram.png",
          status: "copied",
          targetSource: "copied-assets/images/diagram.png"
        }
      ],
      warnings: []
    });
  });
});

function createBufferedOutput(): { value: string; write: (chunk: string) => boolean } {
  return {
    value: "",
    write(chunk: string) {
      this.value += chunk;
      return true;
    }
  };
}
