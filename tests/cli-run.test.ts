import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

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

  it("appends a custom CSS file when one is provided", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const cssPath = path.join(temporaryDirectory, "print.css");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(cssPath, ".document { max-width: 720px; }", "utf8");

    const exitCode = await runCli(["brief.md", "--css", "print.css"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain(".document { max-width: 720px; }");
  });

  it("applies print page options when provided", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--page-size", "A4", "--margin", "20mm"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain("size: A4;");
    expect(html).toContain("margin: 20mm;");
  });

  it("disables table of contents when requested", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief\n\n## Summary", "utf8");

    const exitCode = await runCli(["brief.md", "--no-toc"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).not.toContain('class="toc"');
    expect(html).toContain('<h2 id="summary">Summary</h2>');
  });

  it("writes generated HTML to stdout when requested", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");
    const output = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--stdout"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: output
    });

    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
    expect(exitCode).toBe(0);
    expect(output.value).toContain("<!doctype html>");
    expect(output.value).toContain("<title>Brief</title>");
    expect(output.value).not.toContain("Wrote ");
  });

  it("reads Markdown from stdin and writes generated HTML to stdout", async () => {
    const output = createBufferedOutput();

    const exitCode = await runCli(["--stdin", "--stdout"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdin: Readable.from(["# Piped Document"]),
      stdout: output
    });

    expect(exitCode).toBe(0);
    expect(output.value).toContain("<title>Piped Document</title>");
    expect(output.value).toContain('<h1 id="piped-document">Piped Document</h1>');
  });

  it("requires an output target when reading Markdown from stdin", async () => {
    const errors = createBufferedOutput();

    const exitCode = await runCli(["--stdin"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdin: Readable.from(["# Piped Document"]),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Expected --output or --stdout when reading from stdin.");
  });

  it("requires a title source when reading untitled Markdown from stdin", async () => {
    const errors = createBufferedOutput();

    const exitCode = await runCli(["--stdin", "--stdout"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdin: Readable.from(["Plain paragraph."]),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain(
      "Expected --title, front matter title, or H1 when reading from stdin."
    );
  });

  it("allows --title to provide a title source for stdin Markdown", async () => {
    const output = createBufferedOutput();

    const exitCode = await runCli(["--stdin", "--stdout", "--title", "Piped"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdin: Readable.from(["Plain paragraph."]),
      stdout: output
    });

    expect(exitCode).toBe(0);
    expect(output.value).toContain("<title>Piped</title>");
  });

  it("copies relative image assets beside the generated HTML output", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const imagePath = path.join(temporaryDirectory, "images", "diagram.png");
    const copiedImagePath = path.join(temporaryDirectory, "dist", "images", "diagram.png");

    await writeFile(inputPath, "![Diagram](images/diagram.png)", "utf8");
    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, "image-bytes", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "dist/brief.html"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(await readFile(copiedImagePath, "utf8")).toBe("image-bytes");
  });

  it("warns when a relative image asset cannot be copied", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "![Missing](images/missing.png)", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "dist/brief.html"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(errors.value).toContain('Warning: image asset "images/missing.png" was not copied:');
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
