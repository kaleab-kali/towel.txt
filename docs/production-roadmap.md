# Production Readiness Roadmap

This roadmap tracks the remaining work to make Towel.txt a production-ready
open-source CLI.

## Next Feature

### `feat/error-codes`

Define stable CLI exit codes for scripts.

## Completed Features

1. `feat/stdin-markdown-input`
   - Read Markdown from stdin.
   - Support pipeline workflows with `--stdout`.
   - Require a title source when stdin has no filename context.

2. `feat/output-overwrite-safety`
   - Avoid accidental output overwrites.
   - Add `--force` to intentionally overwrite files.
   - Prevent output paths from replacing the input Markdown file.

3. `feat/pdf-export`
   - Add PDF generation through browser print automation.
   - Respect page size, margin, CSS, and TOC options.

4. `feat/watch-mode`
   - Rebuild output when Markdown or CSS files change.
   - Keep watch behavior scoped to local development.

5. `feat/config-file`
   - Support a project config file for common defaults.
   - Include output, page, margin, CSS, and TOC settings.

6. `feat/theme-system`
   - Add named themes.
   - Start with default, compact, and report themes.

7. `feat/syntax-highlighting`
   - Add print-friendly code highlighting.
   - Keep raw HTML disabled.

8. `feat/footnotes-support`
   - Enable Markdown footnotes.
   - Add print-friendly footnote styling.

9. `feat/document-cover-page`
   - Add an optional cover page from metadata.
   - Support title, subtitle, author, and date.

10. `feat/page-break-controls`
    - Support explicit page breaks.
    - Add CSS helpers for avoiding awkward breaks.

11. `feat/image-validation`
    - Improve image diagnostics.
    - Report copied, skipped, and missing images clearly.

12. `feat/asset-output-directory`
    - Allow copied assets to be placed under a configured folder.

13. `feat/html-minify-option`
    - Add optional minified HTML output.

14. `feat/json-summary-output`
    - Emit a machine-readable summary for CI and scripts.

15. `feat/strict-mode`
    - Fail on missing images, invalid metadata, or warnings.

## Feature Backlog

No remaining feature backlog items are currently planned before production
hardening.

## Completed Hardening

1. `test/cli-fixtures`
   - Add fixture-based CLI tests with real input and output files.

2. `test/cross-platform-paths`
   - Cover Windows and POSIX path behavior.

3. `ci/package-smoke-test`
   - Pack the package and verify the installed binary works.

4. `ci/release-checks`
   - Validate changelog, package metadata, and versioning before release.

5. `docs/complete-cli-reference`
   - Document every CLI option and common workflow.

6. `docs/production-examples`
   - Add examples for reports, briefs, technical notes, images, and custom CSS.

7. `chore/npm-package-readiness`
   - Finalize package metadata and publishable file list.

8. `chore/release-automation`
   - Add release automation after the first package-ready milestone.

9. `docs/security-and-limits`
   - Document raw HTML escaping, local image rules, and CSS assumptions.

## Production Hardening

1. `feat/error-codes`
   - Define stable CLI exit codes for scripts.
