import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

const pageBreakMarkers = new Set(["[[page-break]]", "\\pagebreak", "\\newpage"]);

export function registerPageBreakRule(parser: MarkdownIt): void {
  parser.block.ruler.before("paragraph", "page_break", pageBreakRule);

  parser.renderer.rules.page_break = () => '<div class="page-break" aria-hidden="true"></div>\n';
}

function pageBreakRule(
  state: StateBlock,
  startLine: number,
  _endLine: number,
  silent: boolean
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const end = state.eMarks[startLine];
  const marker = state.src.slice(start, end).trim();

  if (!pageBreakMarkers.has(marker)) {
    return false;
  }

  if (silent) {
    return true;
  }

  const token = state.push("page_break", "div", 0);
  token.block = true;
  token.markup = marker;
  state.line = startLine + 1;

  return true;
}
