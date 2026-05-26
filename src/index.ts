export { extractHeadings, type Heading } from "./parser/headings.js";
export { renderMarkdown, type RenderedMarkdown } from "./parser/markdown.js";
export { renderDocument, type RenderDocumentOptions } from "./render/document.js";
export { buildTableOfContents, renderTableOfContents, type TocItem } from "./render/toc.js";
export { defaultDocumentStyles } from "./theme/default.js";
export { createHeadingId, createUniqueHeadingId } from "./utils/ids.js";

export const packageName = "towel-txt";
