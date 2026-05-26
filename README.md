# Towel.txt

Towel.txt is a small command-line tool for turning Markdown into clean,
printable HTML documents.

It is designed for notes, reports, project writeups, briefs, and other
documents that start as plain Markdown but need a polished browser-printable
output.

## Status

Towel.txt can currently generate self-contained printable HTML from Markdown.
Package publishing and PDF export are planned after the HTML workflow is stable.

## Goals

- Convert Markdown files into readable HTML documents.
- Generate a table of contents from document headings.
- Include print-friendly CSS by default.
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

During local development, run the CLI through pnpm:

```bash
pnpm dev examples/sample.md --output examples/sample.html
```

The CLI supports:

- Markdown input files.
- HTML output files.
- Document title configuration.
- Front matter metadata for title, author, and date.
- Custom CSS appended to the default document styles.
- Heading anchors.
- Print page size and margin configuration.
- Relative local image asset copying.
- Table of contents generation.
- Default screen and print styles.

## Metadata

Documents can include YAML front matter at the top of the Markdown file:

```md
---
title: Project Brief
author: Kaleab
date: 2026-05-27
---

# Project Brief
```

The `title` field controls the generated HTML document title unless `--title` is
provided on the CLI.

## Example

See [examples/sample.md](examples/sample.md) and the generated
[examples/sample.html](examples/sample.html).

See [examples/print.css](examples/print.css) for a small custom CSS example.

The generated HTML is self-contained, so it can be opened directly in a browser
and printed from the browser print dialog.

When output is written to a different directory, safe relative Markdown image
paths such as `images/diagram.png` are copied beside the generated HTML output.

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

- Printable HTML MVP.
- Theme support.
- PDF export through browser automation.

## Contributing

Contributions should be small, focused, and easy to review. See
[CONTRIBUTING.md](CONTRIBUTING.md) for local setup and pull request standards.

## License

MIT
