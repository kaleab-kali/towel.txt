# Security and Limits

Towel.txt is a local document rendering CLI. It is designed for trusted
Markdown, CSS, config, and image files that you control. It is not a sandbox for
untrusted content.

## Markdown HTML

Raw HTML in Markdown is disabled. Markdown input such as `<script>` is escaped
by the Markdown renderer instead of being emitted as active HTML.

Towel.txt also disables automatic linkification. Links are rendered when the
Markdown source explicitly includes link syntax.

## Front Matter

YAML front matter is parsed for supported document metadata. Unsupported fields
and invalid value types produce warnings. Use `--strict` in CI when ignored or
invalid metadata should fail the render.

Supported metadata fields are:

- `title`
- `subtitle`
- `author`
- `date`
- `cover`

## Local Images

For HTML file output, Towel.txt copies safe local Markdown image references next
to the generated output. A copied image source must be a relative local path.

Image references are skipped when they are:

- empty
- fragment-only
- remote or protocol-based
- absolute paths
- paths containing query strings or fragments
- paths containing `..`
- paths with empty path segments

Skipped and missing image assets are reported as warnings. With `--strict`, the
render fails on those warnings.

If strict mode is not enabled, skipped image references remain in the generated
HTML as written. A browser may still request remote image URLs when opening the
HTML document.

Use `--asset-dir <dir>` to place copied local assets under a safe relative
directory in the output folder.

## Custom CSS

Custom CSS passed with `--css` is trusted input. Towel.txt appends it to the
built-in document styles and does not sanitize CSS.

CSS can:

- change document layout and print output
- hide or reveal content
- reference remote resources with CSS features such as `url(...)`

Only use custom CSS files that you trust.

## PDF Export

PDF output uses a local Chrome, Edge, or Chromium browser. The browser renders
the generated HTML and prints it to PDF.

Use a trusted browser executable. A custom `--browser` path points to a local
program that Towel.txt will launch for PDF export.

Remote resources referenced by Markdown links, image URLs, or CSS may be
resolved by the browser during PDF generation.

## File System Access

Towel.txt reads:

- the input Markdown file
- an optional config file
- an optional custom CSS file
- local image files referenced by Markdown

Towel.txt writes:

- the generated HTML or PDF output
- copied local image assets for HTML output
- an optional summary JSON file

Output files are not overwritten unless `--force` is used. Output paths and
summary JSON paths cannot replace the input Markdown file.

## Operational Limits

Towel.txt loads the Markdown document, generated HTML, and related metadata into
memory. It is intended for notes, briefs, reports, and technical writeups rather
than very large generated documents.

There is no hard document size limit. Very large Markdown files, many large
images, or very large custom CSS files may increase memory use and render time.

Watch mode is intended for local development. It watches the input Markdown file
and optional CSS file; it is not a background service or deployment process.

## Recommended CI Usage

For automated checks, use strict mode and summary JSON:

```bash
towel-txt document.md --output document.html --summary-json summary.json --strict
```

This makes missing images, skipped image sources, and invalid metadata fail the
job while still writing machine-readable render details on successful runs.

## Reporting Security Issues

See [../SECURITY.md](../SECURITY.md) for vulnerability reporting instructions.
