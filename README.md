# Towel.txt

Towel.txt is a small command-line tool for turning Markdown into clean,
printable HTML and PDF documents.

It is designed for notes, reports, project writeups, briefs, and other
documents that start as plain Markdown but need a polished browser-printable
output.

## Status

Towel.txt can currently generate self-contained printable HTML and PDF files
from Markdown. PDF export uses a local Chrome, Edge, or Chromium browser.
Package publishing is planned after the core document workflow is stable.

## Goals

- Convert Markdown files into readable HTML documents.
- Generate a table of contents from document headings.
- Include print-friendly CSS by default.
- Highlight common code fences with print-friendly colors.
- Render footnotes with backlinks for longer documents.
- Add an optional cover page from document metadata.
- Insert explicit print page breaks when a document needs fixed pagination.
- Keep output simple enough to inspect, customize, and share.
- Provide a focused CLI that works well in scripts and local workflows.

## Install From Source

```bash
git clone https://github.com/kaleab-kali/towel.txt.git
cd towel.txt
pnpm install
pnpm build
```

## Usage

```bash
towel-txt document.md -o document.html
```

Append a custom CSS file to the built-in print styles:

```bash
towel-txt document.md -o document.html --css examples/print.css
```

Set print page size and margins:

```bash
towel-txt document.md -o document.html --page-size "A4 landscape" --margin 18mm
```

Generate a PDF:

```bash
towel-txt document.md --format pdf -o document.pdf
```

The CLI also infers PDF output from a `.pdf` output path:

```bash
towel-txt document.md -o document.pdf
```

Use a specific browser executable for PDF export:

```bash
towel-txt document.md --format pdf -o document.pdf --browser /path/to/chrome
```

Select a built-in theme:

```bash
towel-txt document.md -o document.html --theme report
```

Add a cover page for a rendered document:

```bash
towel-txt document.md -o document.html --cover --subtitle "Quarterly planning notes"
```

Insert a print page break by placing a marker on its own line:

```md
First section.

[[page-break]]

Second section.
```

Rebuild output when the Markdown or custom CSS file changes:

```bash
towel-txt document.md -o document.html --watch
```

Load defaults from a config file:

```bash
towel-txt document.md --config towel-txt.config.yaml
```

Overwrite an existing output file intentionally:

```bash
towel-txt document.md -o document.html --force
```

Disable the automatic table of contents:

```bash
towel-txt document.md -o document.html --no-toc
```

Write generated HTML to stdout for piping:

```bash
towel-txt document.md --stdout
```

Read Markdown from stdin:

```bash
cat document.md | towel-txt --stdin --stdout
```

During local development, run the CLI through pnpm:

```bash
pnpm dev examples/sample.md --output examples/sample.html
```

The CLI supports:

- Markdown input files.
- HTML output files.
- PDF output files through Chrome, Edge, or Chromium.
- Syntax highlighting for JavaScript, TypeScript, JSON, and shell code fences.
- Footnotes using `[^label]` references and matching definitions.
- Optional cover pages from metadata, config, or `--cover`.
- Explicit page break markers: `[[page-break]]`, `\pagebreak`, and `\newpage`.
- Document title configuration.
- Front matter metadata for title, subtitle, author, date, and cover pages.
- Custom CSS appended to the default document styles.
- Heading anchors.
- Named themes: `default`, `compact`, and `report`.
- Output overwrite protection with an explicit `--force` option.
- Print page size and margin configuration.
- Relative local image asset copying.
- Table of contents generation.
- Optional table of contents suppression.
- Project config files for shared defaults.
- Watch mode for rebuilding file output during local editing.
- Stdout output for shell pipelines.
- Stdin input for shell pipelines.
- Default screen and print styles.

## Metadata

Documents can include YAML front matter at the top of the Markdown file:

```md
---
title: Project Brief
subtitle: Quarterly planning notes
author: Kaleab
date: 2026-05-27
cover: true
---

# Project Brief
```

The `title` field controls the generated HTML document title unless `--title` is
provided on the CLI. Set `cover: true` to render a cover page before the table of
contents and document body. Use `--no-cover` to disable a metadata or config
cover page for one command.

## Footnotes

Use `[^label]` references in the document body and matching definitions later in
the Markdown file:

```md
Detailed context can live in a note.[^context]

[^context]: Footnotes support Markdown such as **strong text** and links.
```

Generated footnotes are rendered at the end of the document with backlinks to
their references.

## Page Breaks

Use `[[page-break]]`, `\pagebreak`, or `\newpage` on its own line to insert an
explicit print break. The generated CSS also includes `.break-before-page`,
`.break-after-page`, and `.avoid-page-break` helpers for custom styles.

## Configuration

Towel.txt automatically looks for `towel-txt.config.yaml`,
`towel-txt.config.yml`, or `towel-txt.config.json` in the current working
directory. Use `--config <path>` to load a specific config file, or
`--no-config` to disable discovery.

```yaml
output: dist/document.html
css: examples/print.css
format: html
theme: report
title: Project Brief
subtitle: Quarterly planning notes
cover: true
pageSize: A4
margin: 18mm
tableOfContents: true
```

CLI flags override config defaults. Use `--toc` when a config file disables the
table of contents and one command needs it enabled.

Supported config fields are `output`, `css`, `format`, `theme`, `title`,
`subtitle`, `cover`, `pageSize`, `margin`, `tableOfContents`, and `browser`.

## Example

See [examples/sample.md](examples/sample.md) and the generated
[examples/sample.html](examples/sample.html).

See [examples/print.css](examples/print.css) for a small custom CSS example.
See [examples/towel-txt.config.yaml](examples/towel-txt.config.yaml) for a
small config example.

The generated HTML is self-contained, so it can be opened directly in a browser
and printed from the browser print dialog.

When output is written to a different directory, safe relative Markdown image
paths such as `images/diagram.png` are copied beside the generated HTML output.

PDF output uses browser print automation. Install Chrome, Edge, or Chromium, or
pass `--browser <path>` if the executable is not on the default search path.

## Development

This repository uses Node.js, TypeScript, and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Roadmap

See [docs/production-roadmap.md](docs/production-roadmap.md) for the production
readiness backlog.

## Contributing

Contributions should be small, focused, and easy to review. See
[CONTRIBUTING.md](CONTRIBUTING.md) for local setup and pull request standards.

## License

MIT
