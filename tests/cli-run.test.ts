import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PdfPrintOptions } from "../src/cli/pdf.js";
import { runCli } from "../src/cli/run.js";
import type { WatchFilesOptions } from "../src/cli/watch.js";

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

  it("renders footnotes in generated HTML output", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief\n\nContext[^note].\n\n[^note]: Footnote content.", "utf8");

    const exitCode = await runCli(["brief.md"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain('<section class="footnotes" aria-label="Footnotes">');
    expect(html).toContain("Footnote content.");
  });

  it("renders a cover page from front matter metadata", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(
      inputPath,
      [
        "---",
        "title: Cover Brief",
        "subtitle: Launch notes",
        "author: Kaleab",
        "cover: true",
        "---",
        "# Body",
        "",
        "Ready."
      ].join("\n"),
      "utf8"
    );

    const exitCode = await runCli(["brief.md"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain('<section class="cover-page" aria-label="Cover page">');
    expect(html).toContain('<p class="cover-page-subtitle">Launch notes</p>');
  });

  it("renders page break markers in generated HTML output", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief\n\nBefore.\n\n[[page-break]]\n\nAfter.", "utf8");

    const exitCode = await runCli(["brief.md"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain('<div class="page-break" aria-hidden="true"></div>');
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

  it("does not check output files when writing generated HTML to stdout", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");
    const output = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["brief.md", "--stdout"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: output
    });

    expect(exitCode).toBe(0);
    expect(output.value).toContain("<title>Brief</title>");
    expect(await readFile(outputPath, "utf8")).toBe("existing html");
  });

  it("refuses to overwrite an existing output file without --force", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "brief.html"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Output file already exists. Use --force to overwrite.");
    expect(await readFile(outputPath, "utf8")).toBe("existing html");
  });

  it("overwrites an existing output file when --force is provided", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "brief.html", "--force"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain("<title>Brief</title>");
    expect(html).not.toBe("existing html");
  });

  it("refuses output paths that replace the input Markdown file", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "brief.md", "--force"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Output path cannot replace the input Markdown file.");
    expect(await readFile(inputPath, "utf8")).toBe("# Brief");
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

  it("requires --force before stdin output overwrites an existing file", async () => {
    const outputPath = path.join(temporaryDirectory, "piped.html");
    const errors = createBufferedOutput();

    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["--stdin", "--output", "piped.html"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdin: Readable.from(["# Piped Document"]),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Output file already exists. Use --force to overwrite.");
    expect(await readFile(outputPath, "utf8")).toBe("existing html");
  });

  it("allows stdin output to overwrite an existing file with --force", async () => {
    const outputPath = path.join(temporaryDirectory, "piped.html");

    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["--stdin", "--output", "piped.html", "--force"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdin: Readable.from(["# Piped Document"]),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain("<title>Piped Document</title>");
    expect(html).not.toBe("existing html");
  });

  it("renders a Markdown file to PDF through the configured printer", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const cssPath = path.join(temporaryDirectory, "print.css");
    const outputPath = path.join(temporaryDirectory, "out", "brief.pdf");
    const printed: PdfPrintOptions[] = [];

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(cssPath, ".document { max-width: 720px; }", "utf8");

    const exitCode = await runCli(
      [
        "brief.md",
        "--format",
        "pdf",
        "--output",
        "out/brief.pdf",
        "--page-size",
        "A4",
        "--margin",
        "20mm",
        "--css",
        "print.css",
        "--browser",
        "tools/chrome"
      ],
      {
        cwd: temporaryDirectory,
        pdfPrinter: async (options) => {
          printed.push(options);
          await writeFile(options.outputPath, "%PDF-1.4", "utf8");
        },
        stderr: createBufferedOutput(),
        stdout: createBufferedOutput()
      }
    );

    expect(exitCode).toBe(0);
    expect(await readFile(outputPath, "utf8")).toBe("%PDF-1.4");
    expect(printed).toHaveLength(1);
    expect(printed[0]?.basePath).toBe(temporaryDirectory);
    expect(printed[0]?.browserPath).toBe(path.join(temporaryDirectory, "tools", "chrome"));
    expect(printed[0]?.html).toContain("size: A4;");
    expect(printed[0]?.html).toContain("margin: 20mm;");
    expect(printed[0]?.html).toContain(".document { max-width: 720px; }");
  });

  it("infers PDF output from a .pdf output path", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.pdf");
    const printed: PdfPrintOptions[] = [];

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "brief.pdf"], {
      cwd: temporaryDirectory,
      pdfPrinter: async (options) => {
        printed.push(options);
        await writeFile(options.outputPath, "%PDF-1.4", "utf8");
      },
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(printed).toHaveLength(1);
    expect(await readFile(outputPath, "utf8")).toBe("%PDF-1.4");
  });

  it("uses a PDF default output path when PDF format is requested", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.pdf");

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--format", "pdf"], {
      cwd: temporaryDirectory,
      pdfPrinter: async (options) => {
        await writeFile(options.outputPath, "%PDF-1.4", "utf8");
      },
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(await readFile(outputPath, "utf8")).toBe("%PDF-1.4");
  });

  it("rejects PDF output to stdout", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--format", "pdf", "--stdout"], {
      cwd: temporaryDirectory,
      pdfPrinter: async () => {
        throw new Error("PDF printer should not run.");
      },
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("PDF output requires --output instead of --stdout.");
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
    const output = createBufferedOutput();

    await writeFile(inputPath, "![Diagram](images/diagram.png)", "utf8");
    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, "image-bytes", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "dist/brief.html"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: output
    });

    expect(exitCode).toBe(0);
    expect(output.value).toContain("Copied image asset: images/diagram.png");
    expect(await readFile(copiedImagePath, "utf8")).toBe("image-bytes");
  });

  it("copies relative image assets into a configured asset directory", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const imagePath = path.join(temporaryDirectory, "images", "diagram.png");
    const copiedImagePath = path.join(
      temporaryDirectory,
      "dist",
      "assets",
      "images",
      "diagram.png"
    );

    await writeFile(inputPath, "![Diagram](images/diagram.png)", "utf8");
    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, "image-bytes", "utf8");

    const exitCode = await runCli(
      ["brief.md", "--output", "dist/brief.html", "--asset-dir", "assets"],
      {
        cwd: temporaryDirectory,
        stderr: createBufferedOutput(),
        stdout: createBufferedOutput()
      }
    );

    const html = await readFile(path.join(temporaryDirectory, "dist", "brief.html"), "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain('src="assets/images/diagram.png"');
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
    expect(errors.value).toContain('Warning: image asset "images/missing.png" is missing:');
  });

  it("warns when an image asset source is skipped", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "![Remote](https://example.com/image.png)", "utf8");

    const exitCode = await runCli(["brief.md", "--output", "dist/brief.html"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(errors.value).toContain(
      'Warning: image asset "https://example.com/image.png" was skipped: remote or protocol-based image source'
    );
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

  it("loads default rendering options from a project config file", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const cssPath = path.join(temporaryDirectory, "print.css");
    const imagePath = path.join(temporaryDirectory, "images", "diagram.png");
    const outputPath = path.join(temporaryDirectory, "dist", "configured.html");
    const copiedImagePath = path.join(
      temporaryDirectory,
      "dist",
      "configured-assets",
      "images",
      "diagram.png"
    );

    await writeFile(inputPath, "# Brief\n\n![Diagram](images/diagram.png)\n\n## Summary", "utf8");
    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(imagePath, "image-bytes", "utf8");
    await writeFile(cssPath, ".document { max-width: 640px; }", "utf8");
    await writeFile(
      path.join(temporaryDirectory, "towel-txt.config.yaml"),
      [
        "output: dist/configured.html",
        "assetDir: configured-assets",
        "title: Configured Brief",
        "subtitle: Configured Subtitle",
        "cover: true",
        "css: print.css",
        "theme: report",
        "pageSize: A4",
        "margin: 20mm",
        "tableOfContents: false"
      ].join("\n"),
      "utf8"
    );

    const exitCode = await runCli(["brief.md"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain("<title>Configured Brief</title>");
    expect(html).toContain('src="configured-assets/images/diagram.png"');
    expect(await readFile(copiedImagePath, "utf8")).toBe("image-bytes");
    expect(html).toContain('<section class="cover-page" aria-label="Cover page">');
    expect(html).toContain('<p class="cover-page-subtitle">Configured Subtitle</p>');
    expect(html).toContain("/* theme: report */");
    expect(html).toContain(".document { max-width: 640px; }");
    expect(html).toContain("size: A4;");
    expect(html).toContain("margin: 20mm;");
    expect(html).not.toContain('class="toc"');
  });

  it("lets CLI flags override project config defaults", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "cli.html");

    await writeFile(inputPath, "# Brief\n\n## Summary", "utf8");
    await writeFile(
      path.join(temporaryDirectory, "towel-txt.config.yaml"),
      [
        "output: config.html",
        "title: Config Title",
        "cover: true",
        "theme: report",
        "tableOfContents: false"
      ].join("\n"),
      "utf8"
    );

    const exitCode = await runCli(
      [
        "brief.md",
        "--output",
        "cli.html",
        "--title",
        "CLI Title",
        "--theme",
        "compact",
        "--toc",
        "--no-cover"
      ],
      {
        cwd: temporaryDirectory,
        stderr: createBufferedOutput(),
        stdout: createBufferedOutput()
      }
    );

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(html).toContain("<title>CLI Title</title>");
    expect(html).not.toContain('class="cover-page"');
    expect(html).toContain("/* theme: compact */");
    expect(html).toContain('class="toc"');
    await expect(readFile(path.join(temporaryDirectory, "config.html"), "utf8")).rejects.toThrow();
  });

  it("can disable project config discovery", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const defaultOutputPath = path.join(temporaryDirectory, "brief.html");

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(
      path.join(temporaryDirectory, "towel-txt.config.yaml"),
      "output: config.html",
      "utf8"
    );

    const exitCode = await runCli(["brief.md", "--no-config"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(await readFile(defaultOutputPath, "utf8")).toContain("<title>Brief</title>");
    await expect(readFile(path.join(temporaryDirectory, "config.html"), "utf8")).rejects.toThrow();
  });

  it("loads a specific config file with --config", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const configDirectory = path.join(temporaryDirectory, "settings");
    const outputPath = path.join(configDirectory, "configured.html");

    await writeFile(inputPath, "# Brief", "utf8");
    await mkdir(configDirectory, { recursive: true });
    await writeFile(path.join(configDirectory, "custom.yaml"), "output: configured.html", "utf8");

    const exitCode = await runCli(["brief.md", "--config", "settings/custom.yaml"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(0);
    expect(await readFile(outputPath, "utf8")).toContain("<title>Brief</title>");
  });

  it("returns a usage error for invalid config fields", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(
      path.join(temporaryDirectory, "towel-txt.config.yaml"),
      "unknown: true",
      "utf8"
    );

    const exitCode = await runCli(["brief.md"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Unsupported config field: unknown.");
  });

  it("watches Markdown and CSS inputs and rebuilds output on change", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const cssPath = path.join(temporaryDirectory, "print.css");
    const outputPath = path.join(temporaryDirectory, "brief.html");
    const output = createBufferedOutput();
    const watched: WatchFilesOptions[] = [];

    await writeFile(inputPath, "# Initial", "utf8");
    await writeFile(cssPath, ".document { color: black; }", "utf8");

    const exitCode = await runCli(["brief.md", "--css", "print.css", "--watch"], {
      cwd: temporaryDirectory,
      stderr: createBufferedOutput(),
      stdout: output,
      watcher: async (options) => {
        watched.push(options);
        await writeFile(inputPath, "# Updated", "utf8");
        await options.onChange(inputPath);
      }
    });

    const html = await readFile(outputPath, "utf8");

    expect(exitCode).toBe(0);
    expect(watched).toHaveLength(1);
    expect(watched[0]?.files).toEqual([inputPath, cssPath]);
    expect(html).toContain("<title>Updated</title>");
    expect(output.value).toContain("Watching brief.md, print.css\n");
    expect(output.value).toContain("Change detected: brief.md\n");
  });

  it("requires --force when watch mode starts with an existing output file", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const outputPath = path.join(temporaryDirectory, "brief.html");
    const errors = createBufferedOutput();
    let watcherRan = false;

    await writeFile(inputPath, "# Brief", "utf8");
    await writeFile(outputPath, "existing html", "utf8");

    const exitCode = await runCli(["brief.md", "--watch"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput(),
      watcher: async () => {
        watcherRan = true;
      }
    });

    expect(exitCode).toBe(1);
    expect(watcherRan).toBe(false);
    expect(errors.value).toContain("Output file already exists. Use --force to overwrite.");
    expect(await readFile(outputPath, "utf8")).toBe("existing html");
  });

  it("rejects watch mode with stdin input", async () => {
    const errors = createBufferedOutput();

    const exitCode = await runCli(["--stdin", "--output", "brief.html", "--watch"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdin: Readable.from(["# Brief"]),
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Watch mode requires an input file instead of --stdin.");
  });

  it("rejects watch mode with stdout output", async () => {
    const inputPath = path.join(temporaryDirectory, "brief.md");
    const errors = createBufferedOutput();

    await writeFile(inputPath, "# Brief", "utf8");

    const exitCode = await runCli(["brief.md", "--stdout", "--watch"], {
      cwd: temporaryDirectory,
      stderr: errors,
      stdout: createBufferedOutput()
    });

    expect(exitCode).toBe(1);
    expect(errors.value).toContain("Watch mode requires file output instead of --stdout.");
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
