# CLI Reference

This reference documents the `towel-txt` command-line interface.

## Usage

```bash
towel-txt <input.md> [--output output.html] [--title "Document Title"]
towel-txt <input.md> --format pdf --output output.pdf
towel-txt <input.md> --watch [--output output.html]
towel-txt --stdin --stdout [--title "Document Title"]
```

Use `towel-txt --help` to print the built-in help text and
`towel-txt --version` to print the package name and version.

## Inputs

Towel.txt renders one Markdown document per command.

Use an input file:

```bash
towel-txt document.md --output document.html
```

Use stdin for shell pipelines:

```bash
cat document.md | towel-txt --stdin --stdout
```

When reading from stdin, the document needs a title source because there is no
filename context. Provide one of:

- `--title`
- `title` in front matter
- a level-one Markdown heading

## Outputs

HTML is the default output format. If `--output` is omitted for file input, the
output path defaults to the input filename with the selected format extension.

```bash
towel-txt notes.md
```

This writes `notes.html`.

PDF output can be requested explicitly:

```bash
towel-txt notes.md --format pdf --output notes.pdf
```

PDF output is also inferred from a `.pdf` output path:

```bash
towel-txt notes.md --output notes.pdf
```

PDF rendering uses a local Chrome, Edge, or Chromium browser. Use `--browser`
when the browser executable is not on the default search path.

## Options

| Option                  | Description                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--asset-dir <dir>`     | Copy local Markdown image assets under a safe relative output directory. Rejects absolute paths, URLs, empty path segments, and `..`.                             |
| `--browser <path>`      | Use a specific Chrome, Edge, or Chromium executable for PDF export. Bare command names are allowed in config.                                                     |
| `--config <path>`       | Load defaults from a specific YAML or JSON config file. Cannot be combined with `--no-config`.                                                                    |
| `--cover`               | Add a cover page before the table of contents and document body. Cannot be combined with `--no-cover`.                                                            |
| `--css <path>`          | Append a custom CSS file to the default document styles.                                                                                                          |
| `--force`               | Overwrite an existing output file or summary JSON file. Output paths still cannot replace the input Markdown file.                                                |
| `--format <type>`       | Select `html` or `pdf`. Defaults to `html` unless the output path ends in `.pdf`.                                                                                 |
| `--margin <value>`      | Set print margin, for example `0.75in` or `18mm`.                                                                                                                 |
| `--minify`              | Remove formatting whitespace from generated HTML. Cannot be combined with `--no-minify`.                                                                          |
| `--no-config`           | Disable default config discovery. Cannot be combined with `--config`.                                                                                             |
| `--no-cover`            | Disable a cover page from metadata or config. Cannot be combined with `--cover`.                                                                                  |
| `--no-minify`           | Disable minified HTML output from config. Cannot be combined with `--minify`.                                                                                     |
| `--no-strict`           | Disable strict mode from config. Cannot be combined with `--strict`.                                                                                              |
| `--no-toc`              | Disable automatic table of contents rendering. Cannot be combined with `--toc`.                                                                                   |
| `-o, --output <path>`   | Write output to a file. Required for PDF output and for stdin unless `--stdout` is used.                                                                          |
| `--page-size <value>`   | Set print page size, for example `letter`, `A4`, or `A4 landscape`.                                                                                               |
| `--stdin`               | Read Markdown from stdin. Do not pass an input file with this option.                                                                                             |
| `--stdout`              | Write generated HTML to stdout. PDF output cannot be written to stdout.                                                                                           |
| `--strict`              | Fail the command when warnings are detected. Currently covers image warnings and invalid or ignored front matter metadata. Cannot be combined with `--no-strict`. |
| `--subtitle <text>`     | Override the document subtitle. Used by cover pages and document metadata rendering.                                                                              |
| `--summary-json <path>` | Write a machine-readable JSON render summary after a successful render. The path cannot replace the input or output file.                                         |
| `--theme <name>`        | Select `default`, `compact`, or `report`.                                                                                                                         |
| `--title <title>`       | Override the generated document title.                                                                                                                            |
| `--toc`                 | Enable table of contents rendering when config disables it. Cannot be combined with `--no-toc`.                                                                   |
| `--watch`               | Rebuild file output when the input Markdown or custom CSS file changes. Requires file input and file output.                                                      |
| `-h, --help`            | Print help text.                                                                                                                                                  |
| `--version`             | Print the package name and version.                                                                                                                               |

## Config Files

Towel.txt automatically looks for these files in the current working directory:

- `towel-txt.config.yaml`
- `towel-txt.config.yml`
- `towel-txt.config.json`

Use `--config <path>` to load a specific file or `--no-config` to disable
discovery.

Supported config fields:

| Field             | CLI equivalent              |
| ----------------- | --------------------------- |
| `assetDir`        | `--asset-dir`               |
| `browser`         | `--browser`                 |
| `cover`           | `--cover` or `--no-cover`   |
| `css`             | `--css`                     |
| `format`          | `--format`                  |
| `margin`          | `--margin`                  |
| `minify`          | `--minify` or `--no-minify` |
| `output`          | `--output`                  |
| `pageSize`        | `--page-size`               |
| `strict`          | `--strict` or `--no-strict` |
| `subtitle`        | `--subtitle`                |
| `summaryJson`     | `--summary-json`            |
| `tableOfContents` | `--toc` or `--no-toc`       |
| `theme`           | `--theme`                   |
| `title`           | `--title`                   |

Example:

```yaml
output: dist/report.html
assetDir: assets
css: examples/print.css
format: html
theme: report
title: Project Report
subtitle: Quarterly planning notes
cover: true
pageSize: A4
margin: 18mm
minify: false
strict: true
summaryJson: dist/report-summary.json
tableOfContents: true
```

CLI flags override config defaults.

## Common Workflows

Render printable HTML:

```bash
towel-txt brief.md --output brief.html
```

Render with custom CSS:

```bash
towel-txt brief.md --output brief.html --css examples/print.css
```

Render a report with a cover page and report theme:

```bash
towel-txt report.md --output report.html --theme report --cover --subtitle "Q2 Review"
```

Render compact HTML for scripted output:

```bash
towel-txt brief.md --output brief.html --minify
```

Render with local image assets copied into a dedicated directory:

```bash
towel-txt brief.md --output dist/brief.html --asset-dir assets
```

Render a PDF:

```bash
towel-txt brief.md --format pdf --output brief.pdf
```

Write a JSON summary and fail on warnings:

```bash
towel-txt brief.md --output brief.html --summary-json summary.json --strict
```

Use stdin and stdout:

```bash
cat brief.md | towel-txt --stdin --stdout --title "Project Brief"
```

Watch a file while editing:

```bash
towel-txt brief.md --output brief.html --watch
```

## Exit Behavior

The command exits with stable codes for scripting:

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| `0`  | Success. Rendering succeeded, help text was printed, or the version was printed.     |
| `1`  | Render error. An unexpected render or PDF export failure occurred.                   |
| `2`  | Usage error. Arguments, config, output paths, or workflow combinations were invalid. |
| `3`  | Strict warning failure. Strict mode converted warnings into a failed command.        |

Usage errors are printed with a `Usage error:` prefix and include a reminder to
run `towel-txt --help`.

Strict mode turns warnings into failed commands with exit code `3`. This is
useful in CI when missing images, skipped unsafe image sources, or invalid
metadata should fail the job.
