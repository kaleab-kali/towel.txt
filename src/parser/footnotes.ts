import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";

interface FootnoteDefinition {
  label: string;
  markdown: string;
}

interface FootnoteState {
  definitions: Map<string, FootnoteDefinition>;
  order: string[];
  referenceCounts: Map<string, number>;
}

interface FootnoteEnvironment {
  disableFootnotes?: boolean;
  footnotes?: FootnoteState;
}

interface FootnoteReferenceMeta {
  number: number;
  referenceId: string;
}

export interface ExtractedFootnotes {
  content: string;
  definitions: Map<string, FootnoteDefinition>;
}

const footnoteDefinitionPattern = /^ {0,3}\[\^([A-Za-z0-9_-]+)\]:[ \t]?(.*)$/;
const footnoteReferencePattern = /^\[\^([A-Za-z0-9_-]+)\]/;
const indentedContinuationPattern = /^(?: {2,}|\t)(.*)$/;

export function extractFootnotes(markdown: string): ExtractedFootnotes {
  const definitions = new Map<string, FootnoteDefinition>();
  const contentLines: string[] = [];
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const definitionStart = footnoteDefinitionPattern.exec(lines[index] ?? "");

    if (!definitionStart) {
      contentLines.push(lines[index] ?? "");
      continue;
    }

    const [, label, firstLine] = definitionStart;
    const definitionLines = [firstLine ?? ""];
    let removedLineCount = 1;

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? "";
      const continuation = indentedContinuationPattern.exec(nextLine);

      if (continuation) {
        definitionLines.push(continuation[1] ?? "");
        index += 1;
        removedLineCount += 1;
        continue;
      }

      const followingLine = lines[index + 2] ?? "";

      if (nextLine.trim() === "" && indentedContinuationPattern.test(followingLine)) {
        definitionLines.push("");
        index += 1;
        removedLineCount += 1;
        continue;
      }

      break;
    }

    if (!definitions.has(label)) {
      definitions.set(label, {
        label,
        markdown: trimDefinitionMarkdown(definitionLines)
      });
    }

    contentLines.push(...Array.from({ length: removedLineCount }, () => ""));
  }

  return {
    content: contentLines.join("\n"),
    definitions
  };
}

export function createFootnoteEnvironment(
  definitions: Map<string, FootnoteDefinition>
): FootnoteEnvironment {
  return {
    footnotes: {
      definitions,
      order: [],
      referenceCounts: new Map<string, number>()
    }
  };
}

export function registerFootnoteRules(parser: MarkdownIt): void {
  parser.inline.ruler.before("emphasis", "footnote_ref", footnoteReferenceRule);

  parser.renderer.rules.footnote_ref = (tokens: Token[], index: number) => {
    const meta = tokens[index].meta as FootnoteReferenceMeta;

    return `<sup class="footnote-ref"><a id="fnref-${meta.referenceId}" href="#fn-${meta.number}" aria-label="Footnote ${meta.number}">${meta.number}</a></sup>`;
  };
}

export function renderFootnotes(
  environment: FootnoteEnvironment,
  renderDefinition: (markdown: string) => string
): string {
  const state = environment.footnotes;

  if (!state || state.order.length === 0) {
    return "";
  }

  const items = state.order
    .map((label, index) => {
      const definition = state.definitions.get(label);

      if (!definition) {
        return "";
      }

      const number = index + 1;
      const body = renderDefinition(definition.markdown);
      const bodyWithBackrefs = appendBackrefs(
        body,
        renderBackrefs(number, state.referenceCounts.get(label) ?? 1)
      );

      return `<li id="fn-${number}">\n${indent(bodyWithBackrefs, 2)}\n</li>`;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return "";
  }

  return `<section class="footnotes" aria-label="Footnotes">
<ol>
${items.join("\n")}
</ol>
</section>`;
}

function footnoteReferenceRule(state: StateInline, silent: boolean): boolean {
  const marker = state.src.slice(state.pos);
  const match = footnoteReferencePattern.exec(marker);
  const environment = state.env as FootnoteEnvironment;
  const footnotes = environment.footnotes;

  if (!match || environment.disableFootnotes || !footnotes) {
    return false;
  }

  const label = match[1] ?? "";

  if (!footnotes.definitions.has(label)) {
    return false;
  }

  if (silent) {
    return true;
  }

  const reference = addFootnoteReference(footnotes, label);
  const token = state.push("footnote_ref", "sup", 0);
  token.meta = reference;
  state.pos += match[0].length;

  return true;
}

function addFootnoteReference(state: FootnoteState, label: string): FootnoteReferenceMeta {
  let orderIndex = state.order.indexOf(label);

  if (orderIndex === -1) {
    state.order.push(label);
    orderIndex = state.order.length - 1;
  }

  const number = orderIndex + 1;
  const count = (state.referenceCounts.get(label) ?? 0) + 1;
  state.referenceCounts.set(label, count);

  return {
    number,
    referenceId: count === 1 ? `${number}` : `${number}-${count}`
  };
}

function renderBackrefs(number: number, count: number): string {
  return Array.from({ length: count }, (_, index) => {
    const referenceId = index === 0 ? `${number}` : `${number}-${index + 1}`;
    const label = count === 1 ? "Back to reference" : `Back to reference ${index + 1}`;

    return `<a class="footnote-backref" href="#fnref-${referenceId}" aria-label="${label}">back</a>`;
  }).join(" ");
}

function appendBackrefs(html: string, backrefs: string): string {
  const trimmedHtml = html.trimEnd();

  if (!trimmedHtml) {
    return `<p>${backrefs}</p>`;
  }

  if (trimmedHtml.endsWith("</p>")) {
    return trimmedHtml.replace(/<\/p>$/, ` ${backrefs}</p>`);
  }

  return `${trimmedHtml}\n<p>${backrefs}</p>`;
}

function trimDefinitionMarkdown(lines: string[]): string {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]?.trim() === "") {
    start += 1;
  }

  while (end > start && lines[end - 1]?.trim() === "") {
    end -= 1;
  }

  return lines.slice(start, end).join("\n");
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);

  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
