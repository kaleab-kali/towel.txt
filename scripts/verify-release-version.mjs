import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const allowZero = args.includes("--allow-zero");
const version = args.find((arg) => !arg.startsWith("--"));

if (!version) {
  fail("Expected a release version argument.");
}

if (!isSemver(version)) {
  fail(`Expected release version to be semver, received "${version}".`);
}

if (version === "0.0.0" && !allowZero) {
  fail("Release version must not be 0.0.0.");
}

const manifest = JSON.parse(await readProjectFile("package.json"));
const metaSource = await readProjectFile("src/meta.ts");
const changelog = await readProjectFile("CHANGELOG.md");
const sourceVersion = getSourceVersion(metaSource);

if (manifest.version !== version) {
  fail(`Release version ${version} does not match package.json version ${manifest.version}.`);
}

if (sourceVersion !== version) {
  fail(`Release version ${version} does not match src/meta.ts version ${sourceVersion}.`);
}

if (version !== "0.0.0" && !hasReleaseHeading(changelog, version)) {
  fail(`CHANGELOG.md must include a release heading for ${version}.`);
}

process.stdout.write(`Release version ${version} verified.\n`);

async function readProjectFile(filePath) {
  return readFile(path.join(packageRoot, filePath), "utf8");
}

function getSourceVersion(source) {
  const match = source.match(/export const packageVersion = "([^"]+)";/u);

  if (!match) {
    fail("src/meta.ts must export packageVersion as a string literal.");
  }

  return match[1];
}

function hasReleaseHeading(markdown, releaseVersion) {
  const escapedVersion = escapeRegExp(releaseVersion);
  const pattern = new RegExp(
    `^## (?:\\[${escapedVersion}\\]|${escapedVersion})(?: - \\d{4}-\\d{2}-\\d{2})?$`,
    "mu"
  );

  return pattern.test(markdown);
}

function isSemver(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
    value
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function fail(message) {
  console.error(`Release version check failed: ${message}`);
  process.exit(1);
}
