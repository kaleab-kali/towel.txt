# API Reference

Towel.txt is primarily a CLI, but the npm package also exposes ESM utilities for
rendering Markdown and building automation around the CLI.

```ts
import { renderDocument, runCli } from "towel-txt";
```

The package requires Node.js 20 or newer.

## CLI Runner

Use `runCli(argv, io)` to invoke the CLI from another Node.js process.

```ts
import { runCli } from "towel-txt";

const output = {
  value: "",
  write(chunk: string) {
    this.value += chunk;
    return true;
  }
};
const errors = {
  value: "",
  write(chunk: string) {
    this.value += chunk;
    return true;
  }
};

const exitCode = await runCli(["doctor", "--json"], {
  cwd: process.cwd(),
  stderr: errors,
  stdout: output
});

const report = JSON.parse(output.value);
```

Related exports:

- `CliIo`
- `CliCommand`
- `CliUsageError`
- `CliStrictModeError`
- `cliExitCodes`
- `CliExitCode`
- `parseCliArgs(argv)`
- `getHelpText()`
- `getDefaultOutputPath(inputPath, format?)`

## Document Rendering

Use `renderDocument(markdown, options?)` when you want HTML as a string without
going through filesystem CLI behavior.

```ts
import { renderDocument } from "towel-txt";

const html = renderDocument("# Project Brief", {
  cover: true,
  subtitle: "Planning notes",
  theme: "report"
});
```

Related exports:

- `RenderDocumentOptions`
- `renderMarkdown(markdown, options?)`
- `RenderedMarkdown`
- `minifyHtml(html)`
- `defaultDocumentStyles`
- `renderPrintPageStyles(options)`
- `PrintPageOptions`

## Markdown Analysis

Use parser exports to inspect Markdown before rendering.

```ts
import { extractHeadings, parseMarkdownInput } from "towel-txt";

const parsed = parseMarkdownInput(markdown);
const headings = extractHeadings(parsed.content);
```

Related exports:

- `extractHeadings(markdown)`
- `Heading`
- `parseMarkdownInput(markdown)`
- `ParsedMarkdownInput`
- `DocumentMetadata`
- `MetadataParseError`
- `extractImageReferences(markdown)`
- `extractLocalImageSources(markdown)`
- `ImageReference`

## Table Of Contents

Use table-of-contents helpers when composing custom HTML around parsed headings.

```ts
import { buildTableOfContents, renderTableOfContents } from "towel-txt";

const items = buildTableOfContents(headings);
const tocHtml = renderTableOfContents(headings);
```

Related exports:

- `TocItem`
- `createHeadingId(text)`
- `createUniqueHeadingId(text, seenIds)`

## Asset And Summary Helpers

Use these helpers when mirroring CLI behavior in custom tools.

```ts
import { copyLocalImageAssets, writeRenderSummary } from "towel-txt";
```

Related exports:

- `copyLocalImageAssets(options)`
- `CopyImageAssetsOptions`
- `ImageAssetCopyResult`
- `getImageAssetWarning(result)`
- `getImageAssetWarnings(results)`
- `writeRenderSummary(path, summary)`
- `RenderSummary`

## Package Metadata

Use these exports for diagnostics and generated reports:

- `packageName`
- `packageVersion`
