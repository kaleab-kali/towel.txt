import { createUniqueHeadingId } from "../utils/ids.js";

export interface Heading {
  id: string;
  level: number;
  line: number;
  text: string;
}

interface FenceState {
  marker: "`" | "~";
  size: number;
}

const atxHeadingPattern = /^[ \t]{0,3}(#{1,6})(?:[ \t]+|$)(.*)$/;
const fencePattern = /^[ \t]{0,3}(`{3,}|~{3,})/;

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seenIds = new Map<string, number>();
  let fenceState: FenceState | undefined;

  markdown.split(/\r?\n/).forEach((line, index) => {
    fenceState = nextFenceState(line, fenceState);

    if (fenceState) {
      return;
    }

    const match = atxHeadingPattern.exec(line);

    if (!match) {
      return;
    }

    const [, marker, rawText] = match;
    const text = normalizeHeadingText(rawText);

    headings.push({
      id: createUniqueHeadingId(text, seenIds),
      level: marker.length,
      line: index + 1,
      text
    });
  });

  return headings;
}

function nextFenceState(
  line: string,
  currentState: FenceState | undefined
): FenceState | undefined {
  const match = fencePattern.exec(line);

  if (!match) {
    return currentState;
  }

  const fence = match[1];
  const marker = fence[0] as FenceState["marker"];
  const size = fence.length;

  if (!currentState) {
    return { marker, size };
  }

  if (currentState.marker === marker && size >= currentState.size) {
    return undefined;
  }

  return currentState;
}

function normalizeHeadingText(rawText: string): string {
  return rawText
    .replace(/[ \t]+#{1,}[ \t]*$/u, "")
    .trim()
    .replace(/\\([\\`*_[\]{}()#+\-.!?|>])/g, "$1");
}
