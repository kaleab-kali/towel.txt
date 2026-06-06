# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project uses Semantic
Versioning.

## Unreleased

### Added

- Release workflow serialization and timeout guardrails for safer publishing.
- Maintainer release preflight check for repository metadata, branch protection,
  workflow health, npm package state, and publish credentials.
- Automated coverage for release preflight success and failure scenarios.
- `inspect --json` command for agent-friendly document analysis without writing
  render output.
- `doctor --json` command for agent-friendly environment, config, and PDF
  browser readiness checks.
- Agent workflow guide and package API reference for automation users.
- JSON schemas for config files, render summaries, inspect output, and
  doctor output, and structured errors.
- `--error-json` for machine-readable CLI errors on stderr.

### Changed

- Release publishing now uses npm Trusted Publishing instead of a long-lived
  `NPM_TOKEN` secret.

## 0.1.0 - 2026-05-30

### Added

- Initial open-source project scaffold.
- CLI file rendering from Markdown input to printable HTML output.
- Complete CLI reference for options, config fields, and common workflows.
- Custom CSS support for generated HTML documents.
- Dependabot update groups for npm dependencies and GitHub Actions.
- Documented the production readiness roadmap.
- Explicit page break markers and print break helper classes.
- Example Markdown document and generated printable HTML output.
- Example custom print CSS file.
- Front matter metadata parsing for document title, subtitle, author, date, and cover fields.
- GitHub Actions workflow dependencies updated to Node 24-compatible majors.
- Local relative image asset copying with copied, skipped, and missing diagnostics.
- Local image paths with Windows separators are handled consistently across platforms.
- Local image asset output directories with generated image path rewriting.
- Minor and patch Dependabot grouping with manual handling for major npm updates.
- Markdown heading extraction with stable heading IDs.
- Markdown body HTML rendering with safe raw HTML escaping.
- Named document themes: `default`, `compact`, and `report`.
- Optional cover pages from metadata, config, or CLI flags.
- Optional minified HTML output with `--minify` or config defaults.
- Optional table of contents suppression with `--no-toc`.
- Output overwrite protection with `--force`.
- Package metadata, exports, and publishable file list readiness checks.
- CodeQL code scanning for JavaScript and TypeScript security analysis.
- Package smoke testing for packed CLI installs.
- PDF export through a local Chrome, Edge, or Chromium browser.
- Production examples for reports, briefs, technical notes, images, and custom CSS.
- Print page size and margin options for generated HTML documents.
- Printable HTML document rendering with default screen and print styles.
- Project config files with `--config` and `--no-config`.
- Release checks for changelog, package metadata, and version consistency.
- Release workflow for verified package dry-runs and optional publishing.
- Release workflow publish prerequisite validation for npm credentials.
- Security audit and performance smoke gates in CI and release verification.
- Vitest upgraded to a patched 4.x release for GHSA-5xrq-8626-4rwp.
- Windows CI coverage for cross-platform CLI verification.
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
