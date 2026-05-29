import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [sectionTitle, outputPath] = process.argv.slice(2);

if (!sectionTitle || !outputPath) {
  fail("Expected a changelog section title and output path.");
}

const changelog = await readFile(path.join(packageRoot, "CHANGELOG.md"), "utf8");
const releaseNotes = getSecondLevelSection(changelog, sectionTitle);

if (!releaseNotes?.trim()) {
  fail(`CHANGELOG.md does not contain notes for ${sectionTitle}.`);
}

await writeFile(path.resolve(packageRoot, outputPath), `${releaseNotes.trim()}\n`, "utf8");
process.stdout.write(`Wrote release notes for ${sectionTitle} to ${outputPath}.\n`);

function getSecondLevelSection(markdown, title) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => isMatchingHeading(line, title));

  if (start === -1) {
    return undefined;
  }

  const relativeEnd = lines.slice(start + 1).findIndex((line) => line.startsWith("## "));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;

  return lines.slice(start + 1, end).join("\n");
}

function isMatchingHeading(line, title) {
  const escapedTitle = escapeRegExp(title);
  const pattern = new RegExp(
    `^## (?:\\[${escapedTitle}\\]|${escapedTitle})(?: - \\d{4}-\\d{2}-\\d{2})?$`,
    "u"
  );

  return pattern.test(line.trim());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function fail(message) {
  console.error(`Release notes extraction failed: ${message}`);
  process.exit(1);
}
