# Towel.txt

Towel.txt turns Markdown into clean, printable HTML and PDF documents from the
command line.

It is built for notes, reports, briefs, project writeups, technical documents,
and other Markdown files that need a polished browser-printable output without
pulling in a large publishing system.

## Highlights

- Render Markdown to print-friendly HTML.
- Generate PDFs through a local Chrome, Edge, or Chromium browser.
- Include a table of contents from document headings.
- Render footnotes with backlinks.
- Add cover pages from metadata, config, or CLI flags.
- Insert explicit print page breaks.
- Copy safe local image assets beside HTML output.
- Add custom CSS on top of the built-in document styles.
- Inspect Markdown inputs as JSON before rendering.
- Validate machine-readable outputs with published JSON schemas.
- Use strict mode and JSON summaries in CI scripts.

## Install

Install globally from npm:

```bash
npm install -g towel-txt
```

Or run it without a global install:

```bash
npx towel-txt@latest document.md --output document.html
```

Towel.txt requires Node.js 20 or newer. PDF output also requires Chrome, Edge,
or Chromium to be installed locally.

## Quick Start

Render a Markdown file to HTML:

```bash
towel-txt document.md --output document.html
```

Open `document.html` in a browser and print it normally.

Render a PDF:

```bash
towel-txt document.md --format pdf --output document.pdf
```

The CLI also infers PDF output from a `.pdf` path:

```bash
towel-txt document.md --output document.pdf
```

Print the installed version:

```bash
towel-txt --version
```

For the full command reference, see [docs/cli-reference.md](docs/cli-reference.md).

Inspect a document without writing output:

```bash
towel-txt inspect document.md --json
```

The inspection JSON reports metadata, title source, headings, image references,
warnings, loaded config, and the render plan. This is useful for automation and
AI agents that need to validate a document before rendering it.

Return machine-readable errors for agent workflows:

```bash
towel-txt document.md --strict --error-json
```

## Common Workflows

Use a custom CSS file:

```bash
towel-txt report.md --output report.html --css examples/print.css
```

Use a built-in theme:

```bash
towel-txt report.md --output report.html --theme report
```

Add a cover page:

```bash
towel-txt report.md --output report.html --cover --subtitle "Quarterly review"
```

Set page size and margins:

```bash
towel-txt report.md --output report.html --page-size "A4 landscape" --margin 18mm
```

Copy local image assets into a dedicated output folder:

```bash
towel-txt report.md --output dist/report.html --asset-dir assets
```

Write a machine-readable render summary:

```bash
towel-txt report.md --output report.html --summary-json summary.json
```

JSON schemas for config, render summaries, inspection output, and structured
errors are published in [schemas](schemas).

Fail the command when warnings are detected:

```bash
towel-txt report.md --output report.html --strict
```

Watch a document while editing:

```bash
towel-txt report.md --output report.html --watch
```

Use stdin and stdout in a shell pipeline:

```bash
cat report.md | towel-txt --stdin --stdout --title "Project Report"
```

## Markdown Features

Towel.txt supports common Markdown document features, including headings, tables,
block quotes, lists, code fences, links, images, footnotes, and front matter.

### Metadata

Add YAML front matter at the top of a document:

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

Supported metadata fields are `title`, `subtitle`, `author`, `date`, and
`cover`. CLI flags override metadata when both are provided.

### Footnotes

Use `[^label]` references and matching definitions:

```md
Detailed context can live in a note.[^context]

[^context]: Footnotes support Markdown such as **strong text** and links.
```

Generated footnotes are rendered at the end of the document with backlinks to
their references.

### Page Breaks

Use `[[page-break]]`, `\pagebreak`, or `\newpage` on its own line:

```md
First section.

[[page-break]]

Second section.
```

The generated CSS also includes `.break-before-page`, `.break-after-page`, and
`.avoid-page-break` helpers for custom styles.

## Configuration

Towel.txt looks for these files in the current working directory:

- `towel-txt.config.yaml`
- `towel-txt.config.yml`
- `towel-txt.config.json`

Use `--config <path>` to load a specific config file, or `--no-config` to
disable config discovery.

Example config:

```yaml
output: dist/report.html
assetDir: assets
css: examples/print.css
format: html
theme: report
title: Project Brief
subtitle: Quarterly planning notes
cover: true
pageSize: A4
margin: 18mm
minify: false
strict: true
summaryJson: dist/report-summary.json
tableOfContents: true
```

Supported config fields are `output`, `assetDir`, `css`, `format`, `theme`,
`title`, `subtitle`, `cover`, `pageSize`, `margin`, `minify`, `strict`,
`summaryJson`, `tableOfContents`, and `browser`.

## Examples

- [examples/sample.md](examples/sample.md) shows a basic printable document.
- [examples/report.md](examples/report.md) shows a report-style document.
- [examples/technical-note.md](examples/technical-note.md) shows a technical note.
- [examples/image-workflow.md](examples/image-workflow.md) shows local image handling.
- [docs/examples.md](docs/examples.md) walks through common example workflows.

## Security And Limits

Towel.txt is a local rendering tool for Markdown, CSS, config, and image files
that you control. It is not a sandbox for untrusted content.

Important defaults:

- Raw HTML in Markdown is disabled and escaped.
- Automatic linkification is disabled.
- Local image copying rejects remote URLs, protocol-based sources, absolute
  paths, query strings, fragments, empty path segments, and `..` traversal.
- Custom CSS is trusted input and is appended without sanitization.
- PDF export launches a trusted local browser executable.

See [docs/security-and-limits.md](docs/security-and-limits.md) for the full
security model and operational limits.

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/kaleab-kali/towel.txt.git
cd towel.txt
pnpm install
```

Run the local CLI:

```bash
pnpm dev examples/sample.md --output examples/sample.html
```

Run the project checks:

```bash
pnpm release:check
pnpm format:check
pnpm lint
pnpm security:audit
pnpm typecheck
pnpm test
pnpm build
pnpm perf:smoke
pnpm smoke:package
```

## Contributing

Contributions are welcome. Keep changes focused, include tests for behavior
changes, and make sure the project checks pass before opening a pull request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and pull request
standards.

## License

MIT
