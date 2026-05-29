# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project uses Semantic
Versioning after the first public release.

## Unreleased

### Added

- Initial open-source project scaffold.
- CLI file rendering from Markdown input to printable HTML output.
- Complete CLI reference for options, config fields, and common workflows.
- Custom CSS support for generated HTML documents.
- Documented the production readiness roadmap.
- Explicit page break markers and print break helper classes.
- Example Markdown document and generated printable HTML output.
- Example custom print CSS file.
- Front matter metadata parsing for document title, subtitle, author, date, and cover fields.
- Local relative image asset copying with copied, skipped, and missing diagnostics.
- Local image paths with Windows separators are handled consistently across platforms.
- Local image asset output directories with generated image path rewriting.
- Markdown heading extraction with stable heading IDs.
- Markdown body HTML rendering with safe raw HTML escaping.
- Named document themes: `default`, `compact`, and `report`.
- Optional cover pages from metadata, config, or CLI flags.
- Optional minified HTML output with `--minify` or config defaults.
- Optional table of contents suppression with `--no-toc`.
- Output overwrite protection with `--force`.
- Package metadata, exports, and publishable file list readiness checks.
- Package smoke testing for packed CLI installs.
- PDF export through a local Chrome, Edge, or Chromium browser.
- Production examples for reports, briefs, technical notes, images, and custom CSS.
- Print page size and margin options for generated HTML documents.
- Printable HTML document rendering with default screen and print styles.
- Project config files with `--config` and `--no-config`.
- Release checks for changelog, package metadata, and version consistency.
- Release workflow for verified package dry-runs and optional publishing.
- Print-friendly footnotes with backlinks.
- Render summary JSON files for CI and script workflows.
- Security and limits documentation for rendering, image copying, CSS, and PDF export.
- Stable CLI exit codes for usage errors, render errors, and strict warning failures.
- Strict mode for failing renders when warnings are detected.
- Stdin Markdown input with `--stdin`.
- Stdout HTML output with `--stdout`.
- Syntax highlighting for JavaScript, TypeScript, JSON, and shell code fences.
- Table of contents tree building and HTML rendering.
- Watch mode with `--watch` for local Markdown and CSS rebuilds.
