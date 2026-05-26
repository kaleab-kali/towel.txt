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

During local development, run the CLI through pnpm:

```bash
pnpm dev examples/sample.md --output examples/sample.html
```

The CLI supports:

- Markdown input files.
- HTML output files.
- Document title configuration.
- Heading anchors.
- Table of contents generation.
- Default screen and print styles.

## Example

See [examples/sample.md](examples/sample.md) and the generated
[examples/sample.html](examples/sample.html).

The generated HTML is self-contained, so it can be opened directly in a browser
and printed from the browser print dialog.

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
- Metadata fields such as title, author, and date.
- Local image handling.
- PDF export through browser automation.

## Contributing

Contributions should be small, focused, and easy to review. See
[CONTRIBUTING.md](CONTRIBUTING.md) for local setup and pull request standards.

## License

MIT
