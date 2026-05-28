# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project uses Semantic
Versioning after the first public release.

## Unreleased

### Added

- Initial open-source project scaffold.
- CLI file rendering from Markdown input to printable HTML output.
- Custom CSS support for generated HTML documents.
- Documented the production readiness roadmap.
- Example Markdown document and generated printable HTML output.
- Example custom print CSS file.
- Front matter metadata parsing for document title, author, and date fields.
- Local relative image asset copying for generated HTML output.
- Markdown heading extraction with stable heading IDs.
- Markdown body HTML rendering with safe raw HTML escaping.
- Named document themes: `default`, `compact`, and `report`.
- Optional table of contents suppression with `--no-toc`.
- Output overwrite protection with `--force`.
- PDF export through a local Chrome, Edge, or Chromium browser.
- Print page size and margin options for generated HTML documents.
- Printable HTML document rendering with default screen and print styles.
- Project config files with `--config` and `--no-config`.
- Stdin Markdown input with `--stdin`.
- Stdout HTML output with `--stdout`.
- Table of contents tree building and HTML rendering.
- Watch mode with `--watch` for local Markdown and CSS rebuilds.
