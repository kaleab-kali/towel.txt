import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const packageJson = JSON.parse(await readProjectFile("package.json"));
const changelog = await readProjectFile("CHANGELOG.md");
const metaSource = await readProjectFile("src/meta.ts");

checkPackageMetadata(packageJson);
checkVersionMetadata(packageJson, metaSource, changelog);
checkChangelog(changelog);

if (failures.length > 0) {
  console.error("Release checks failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  process.stdout.write("Release checks passed.\n");
}

async function readProjectFile(filePath) {
  return readFile(path.join(packageRoot, filePath), "utf8");
}

function checkPackageMetadata(manifest) {
  expectEqual(manifest.name, "towel-txt", "package.json name must be towel-txt.");
  expectSemver(manifest.version, "package.json version must be a valid semver version.");
  expectNonEmptyString(manifest.description, "package.json description must be set.");
  expectEqual(manifest.type, "module", "package.json type must be module.");
  expectEqual(manifest.main, "./dist/index.js", "package.json main must point to ./dist/index.js.");
  expectEqual(
    manifest.types,
    "./dist/index.d.ts",
    "package.json types must point to ./dist/index.d.ts."
  );
  expectEqual(
    manifest.exports?.["."]?.types,
    "./dist/index.d.ts",
    "package.json exports must expose root types."
  );
  expectEqual(
    manifest.exports?.["."]?.import,
    "./dist/index.js",
    "package.json exports must expose the root ESM entry."
  );
  expectEqual(
    manifest.exports?.["./package.json"],
    "./package.json",
    "package.json exports must expose ./package.json."
  );
  expectEqual(manifest.license, "MIT", "package.json license must be MIT.");
  expectNonEmptyString(manifest.author, "package.json author must be set.");
  expect(!manifest.private, "package.json must not be marked private.");

  expectEqual(
    manifest.bin?.["towel-txt"],
    "./dist/cli.js",
    "package.json bin.towel-txt must point to ./dist/cli.js."
  );

  expectArrayIncludes(
    manifest.files,
    [
      "dist/**/*.js",
      "dist/**/*.d.ts",
      "dist/**/*.d.ts.map",
      "README.md",
      "LICENSE",
      "CHANGELOG.md",
      "docs/**/*.md",
      "examples/**/*.md",
      "examples/**/*.css",
      "examples/**/*.svg",
      "examples/**/*.yaml"
    ],
    "package.json files must include runtime dist files, docs, and examples."
  );

  expectArrayIncludes(
    manifest.keywords,
    ["markdown", "print", "html", "document", "cli"],
    "package.json keywords must include markdown, print, html, document, and cli."
  );

  expectEqual(manifest.repository?.type, "git", "package.json repository.type must be git.");
  expectEqual(
    manifest.repository?.url,
    "git+https://github.com/kaleab-kali/towel.txt.git",
    "package.json repository.url must point to the public GitHub repository."
  );
  expectEqual(
    manifest.bugs?.url,
    "https://github.com/kaleab-kali/towel.txt/issues",
    "package.json bugs.url must point to GitHub issues."
  );
  expectEqual(
    manifest.homepage,
    "https://github.com/kaleab-kali/towel.txt#readme",
    "package.json homepage must point to the README."
  );
  expectEqual(manifest.engines?.node, ">=20", "package.json engines.node must be >=20.");
  expectEqual(
    manifest.publishConfig?.access,
    "public",
    "package.json publishConfig.access must be public."
  );
  expectEqual(manifest.scripts?.prepack, "pnpm build", "package.json prepack must build dist.");
  expectEqual(
    manifest.scripts?.["perf:smoke"],
    "node scripts/performance-smoke.mjs",
    "package.json perf:smoke must run the performance smoke script."
  );
  expectEqual(
    manifest.scripts?.["security:audit"],
    "pnpm audit --audit-level high",
    "package.json security:audit must run a high-severity dependency audit."
  );
  expect(
    typeof manifest.packageManager === "string" && manifest.packageManager.startsWith("pnpm@"),
    "package.json packageManager must pin pnpm."
  );
}

function checkVersionMetadata(manifest, metaText, changelogText) {
  const versionMatch = metaText.match(/export const packageVersion = "([^"]+)";/u);

  expect(versionMatch, "src/meta.ts must export packageVersion as a string literal.");

  if (versionMatch) {
    expectEqual(
      versionMatch[1],
      manifest.version,
      "src/meta.ts packageVersion must match package.json version."
    );
  }

  if (manifest.version !== "0.0.0") {
    expect(
      hasReleaseHeading(changelogText, manifest.version),
      `CHANGELOG.md must include a release heading for ${manifest.version}.`
    );
  }
}

function checkChangelog(changelogText) {
  expect(
    changelogText.startsWith("# Changelog\n"),
    "CHANGELOG.md must start with a Changelog heading."
  );

  const unreleased = getSecondLevelSection(changelogText, "Unreleased");

  expect(unreleased !== undefined, "CHANGELOG.md must include an Unreleased section.");

  if (unreleased !== undefined) {
    expect(
      /^### (Added|Changed|Deprecated|Removed|Fixed|Security)$/mu.test(unreleased),
      "CHANGELOG.md Unreleased must include a Keep a Changelog category."
    );
    expect(
      /^\s*-\s+\S/mu.test(unreleased),
      "CHANGELOG.md Unreleased must include at least one bullet."
    );
  }
}

function getSecondLevelSection(markdown, title) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);

  if (start === -1) {
    return undefined;
  }

  const relativeEnd = lines.slice(start + 1).findIndex((line) => line.startsWith("## "));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;

  return lines.slice(start + 1, end).join("\n");
}

function hasReleaseHeading(markdown, version) {
  const escapedVersion = escapeRegExp(version);
  const pattern = new RegExp(
    `^## (?:\\[${escapedVersion}\\]|${escapedVersion})(?: - \\d{4}-\\d{2}-\\d{2})?$`,
    "mu"
  );

  return pattern.test(markdown);
}

function expectArrayIncludes(value, expectedValues, message) {
  const hasValues =
    Array.isArray(value) && expectedValues.every((expected) => value.includes(expected));

  expect(hasValues, message);
}

function expectEqual(actual, expected, message) {
  expect(actual === expected, message);
}

function expectNonEmptyString(value, message) {
  expect(typeof value === "string" && value.trim().length > 0, message);
}

function expectSemver(value, message) {
  expect(
    typeof value === "string" &&
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
        value
      ),
    message
  );
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
