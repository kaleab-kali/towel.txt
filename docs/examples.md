# Production Examples

These examples show common Towel.txt workflows using files in the
[`examples`](../examples) directory.

## Report

Use the report theme, a cover page, strict mode, and a render summary when a
document is part of a repeatable reporting workflow.

```bash
towel-txt examples/report.md --output dist/examples/report.html --theme report --cover --summary-json dist/examples/report-summary.json --strict
```

Use the same source to generate a PDF:

```bash
towel-txt examples/report.md --format pdf --output dist/examples/report.pdf --theme report --cover --strict
```

## Brief

Briefs are short decision documents. The compact theme keeps the output dense
enough for review while preserving print styling.

```bash
towel-txt examples/brief.md --output dist/examples/brief.html --theme compact --strict
```

## Technical Note

Technical notes can include code fences, tables, footnotes, and explicit print
breaks.

```bash
towel-txt examples/technical-note.md --output dist/examples/technical-note.html --strict
```

## Images

Local relative Markdown images are copied beside the generated HTML output.
Use `--asset-dir` to place copied assets under a dedicated directory.

```bash
towel-txt examples/image-workflow.md --output dist/examples/image-workflow.html --asset-dir assets --strict
```

## Custom CSS

Use `--css` to append a project stylesheet to the built-in document styles.

```bash
towel-txt examples/report.md --output dist/examples/report-custom.html --theme report --cover --css examples/report.css --strict
```

## CI-Friendly Summary

Use strict mode with summary JSON when another tool needs to inspect the render
result.

```bash
towel-txt examples/report.md --output dist/examples/report.html --summary-json dist/examples/report-summary.json --strict --force
```
