export { extractHeadings, type Heading } from "./parser/headings.js";
export { renderMarkdown, type RenderedMarkdown } from "./parser/markdown.js";
export { parseCliArgs, CliUsageError, type CliCommand } from "./cli/args.js";
export { getDefaultOutputPath, getHelpText, runCli, type CliIo } from "./cli/run.js";
export { packageName, packageVersion } from "./meta.js";
export { renderDocument, type RenderDocumentOptions } from "./render/document.js";
export { buildTableOfContents, renderTableOfContents, type TocItem } from "./render/toc.js";
export { defaultDocumentStyles } from "./theme/default.js";
export { createHeadingId, createUniqueHeadingId } from "./utils/ids.js";
