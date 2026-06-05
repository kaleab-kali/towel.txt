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

    const heading = parseAtxHeading(line);

    if (!heading) {
      return;
    }

    const text = normalizeHeadingText(heading.rawText);

    headings.push({
      id: createUniqueHeadingId(text, seenIds),
      level: heading.level,
      line: index + 1,
      text
    });
  });

  return headings;
}

function parseAtxHeading(line: string): { level: number; rawText: string } | undefined {
  let index = 0;

  while (index < line.length && index < 4 && isSpaceOrTab(line[index])) {
    index += 1;
  }

  if (index > 3) {
    return undefined;
  }

  let level = 0;

  while (line[index] === "#") {
    level += 1;
    index += 1;
  }

  if (level === 0 || level > 6) {
    return undefined;
  }

  const separator = line[index];

  if (separator !== undefined && !isSpaceOrTab(separator)) {
    return undefined;
  }

  while (isSpaceOrTab(line[index])) {
    index += 1;
  }

  return {
    level,
    rawText: line.slice(index)
  };
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
    .slice(0, getClosingHashStart(rawText))
    .trim()
    .replace(/\\([\\`*_[\]{}()#+\-.!?|>])/g, "$1");
}

function getClosingHashStart(rawText: string): number {
  let end = rawText.length;

  while (end > 0 && isSpaceOrTab(rawText[end - 1])) {
    end -= 1;
  }

  let hashStart = end;

  while (hashStart > 0 && rawText[hashStart - 1] === "#") {
    hashStart -= 1;
  }

  if (hashStart === end || hashStart === 0 || !isSpaceOrTab(rawText[hashStart - 1])) {
    return rawText.length;
  }

  while (hashStart > 0 && isSpaceOrTab(rawText[hashStart - 1])) {
    hashStart -= 1;
  }

  return hashStart;
}

function isSpaceOrTab(value: string | undefined): boolean {
  return value === " " || value === "\t";
}
