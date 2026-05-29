---
title: CLI Rendering Technical Note
subtitle: Rendering flow and CI checks
author: Towel.txt contributors
date: 2026-05-29
---

# CLI Rendering Technical Note

This note explains the high-level rendering flow for a Markdown document.

## Flow

1. Parse CLI arguments and config defaults.
2. Read Markdown from a file or stdin.
3. Parse front matter metadata and Markdown content.
4. Copy safe local image assets for HTML file output.
5. Render the printable document HTML.
6. Optionally minify HTML or print it to PDF.
7. Optionally write a JSON render summary.

## Example Command

```bash
towel-txt examples/technical-note.md --output dist/examples/technical-note.html --strict
```

## Release Gate

```bash
pnpm release:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:package
```

## Notes

Strict mode is useful for CI because warnings become failures.[^strict]

[^strict]:
    Current warnings include skipped or missing image assets and invalid
    front matter metadata.
