const fallbackHeadingId = "section";

export function createHeadingId(text: string): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallbackHeadingId;
}

export function createUniqueHeadingId(text: string, seenIds: Map<string, number>): string {
  const baseId = createHeadingId(text);
  const existingCount = seenIds.get(baseId) ?? 0;

  seenIds.set(baseId, existingCount + 1);

  if (existingCount === 0) {
    return baseId;
  }

  return `${baseId}-${existingCount + 1}`;
}
