# Agent Guide

This guide is for automation, CI jobs, and AI agents that need to turn Markdown
into predictable document output.

## Recommended Flow

Run the commands in this order:

```bash
towel-txt doctor --json
towel-txt inspect document.md --json --output document.html
towel-txt document.md --output document.html --summary-json summary.json --strict
```

Use `doctor --json` before rendering on a new machine. It checks:

- Node.js runtime support.
- Config discovery and config file validity.
- Chrome, Edge, or Chromium availability for PDF output.

The report has `ok: true` when every check passes or only warnings are present.
It has `ok: false` and exits with code `2` when a check fails.

Use `inspect --json` before rendering a document. It reports:

- Front matter metadata and title source.
- Heading IDs and line numbers.
- Local, skipped, and missing image references.
- Config loading state.
- Planned render settings and blockers.

Use `--summary-json <path>` on successful renders when another process needs to
read the generated output metadata without scraping stdout.

## Machine-Readable Errors

Add `--error-json` when an agent needs structured stderr on failures:

```bash
towel-txt document.md --output document.html --strict --error-json
```

The JSON error includes:

- `schemaVersion`
- `error.name`
- `error.message`
- `error.type`
- `error.exitCode`

## Exit Codes

| Code | Meaning                                               |
| ---- | ----------------------------------------------------- |
| `0`  | Success.                                              |
| `1`  | Render or PDF export failure.                         |
| `2`  | Usage, config, path, or doctor check failure.         |
| `3`  | Strict mode converted warnings into a failed command. |

## JSON Schemas

Validate machine-readable output with the schemas shipped in the npm package:

- `schemas/config.schema.json`
- `schemas/doctor.schema.json`
- `schemas/error.schema.json`
- `schemas/inspect.schema.json`
- `schemas/render-summary.schema.json`

Each schema uses `schemaVersion: 1` for the current contract.

## Safe Write Pattern

Agents should avoid overwriting files unless the operator explicitly requested
it.

Use this pattern:

```bash
towel-txt inspect document.md --json --output dist/document.html
towel-txt document.md --output dist/document.html --summary-json dist/document.summary.json --strict
```

If the inspection report includes render blockers, resolve those first. If a
file already exists, the render command fails unless `--force` is provided.

## PDF Pattern

For PDF output, first check browser readiness:

```bash
towel-txt doctor --json
towel-txt document.md --format pdf --output document.pdf --strict
```

If the doctor report warns that no PDF browser was found, HTML rendering still
works. PDF rendering requires Chrome, Edge, or Chromium. Use `--browser <path>`
or the `browser` config field when discovery cannot find the executable.

## Config Pattern

Keep repeatable defaults in `towel-txt.config.yaml`:

```yaml
output: dist/report.html
assetDir: assets
format: html
theme: report
strict: true
summaryJson: dist/report.summary.json
tableOfContents: true
```

Then run:

```bash
towel-txt doctor --json
towel-txt report.md
```

Use `--no-config` only when the agent must ignore local project defaults.
