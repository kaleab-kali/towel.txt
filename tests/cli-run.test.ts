import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";

let temporaryDirectory: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "towel-txt-"));
});

afterEach(async () => {
  await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("runCli", () => {
  it("renders a Markdown file to an explicit HTML output path", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "out", "brief.html");
    const output = createBufferedOutput();
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief\n\n## Summary\n\nReady to print.", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "out/brief.html"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: output
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(output.value).toBe(`Wrote ${path.join("out", "brief.html")}\n`);
    expect(errors.value).toBe("");
    expect(html).toContain("<title>Brief</title>");
    expect(html).toContain('<h2 id="summary">Summary</h2>');
  });

  it("uses the default output path when output is omitted", async () => {
    const inputPath = path.join(temporaryDirectory, "notes.md");
    const outputPath = path.join(temporaryDirectory, "notes.html");
    const output = createBufferedOutput();

    await writeFile(inputPath, "# Notes", "utf8");

    const exitCode = await runCli(["notes.md"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: output
    });

    expect(exitCode).toBe(0);
    expect(await readFile(outputPath, "utf8")).toContain("<title>Notes</title>");
  });

  it("returns a usage error for invalid arguments", async () => {
    const errors = createBufferedOutput();

    const exitCode = await runCli([], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Usage error: Expected exactly one Markdown input file.");
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
