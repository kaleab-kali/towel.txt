export { extractHeadings, type Heading } from "./parser/headings.js";
export { renderMarkdown, type RenderedMarkdown } from "./parser/markdown.js";
export {
  MetadataParseError,
  parseMarkdownInput,
  type DocumentMetadata,
  type ParsedMarkdownInput
} from "./parser/metadata.js";
export { parseCliArgs, CliUsageError, type CliCommand } from "./cli/args.js";
export { getDefaultOutputPath, getHelpText, runCli, type CliIo } from "./cli/run.js";
export {
  copyLocalImageAssets,
  type CopyImageAssetsOptions,
  type ImageAssetCopyResult
} from "./cli/assets.js";
export { packageName, packageVersion } from "./meta.js";
export { renderDocument, type RenderDocumentOptions } from "./render/document.js";
export { minifyHtml } from "./render/minify.js";
export { renderPrintPageStyles, type PrintPageOptions } from "./render/print-options.js";
export { buildTableOfContents, renderTableOfContents, type TocItem } from "./render/toc.js";
export { defaultDocumentStyles } from "./theme/default.js";
export { createHeadingId, createUniqueHeadingId } from "./utils/ids.js";
export {
  extractImageReferences,
  extractLocalImageSources,
  type ImageReference
} from "./parser/images.js";
