import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

const execFileAsync = promisify(execFile);
const gunzipAsync = promisify(gunzip);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpmExecPath = process.env.npm_execpath;
const pnpmRunsThroughNode = pnpmExecPath ? /\.(?:cjs|js|mjs)$/iu.test(pnpmExecPath) : false;
const pnpmCommand = pnpmRunsThroughNode ? process.execPath : (pnpmExecPath ?? "pnpm");
const pnpmArgsPrefix = pnpmRunsThroughNode && pnpmExecPath ? [pnpmExecPath] : [];
const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "towel-txt-package-"));

try {
  const packDirectory = path.join(temporaryDirectory, "pack");
  const smokeDirectory = path.join(temporaryDirectory, "smoke");

  await mkdir(packDirectory, { recursive: true });
  await mkdir(smokeDirectory, { recursive: true });
  await runPnpm(["pack", "--pack-destination", packDirectory], packageRoot);

  const tarball = (await readdir(packDirectory)).find((entry) => entry.endsWith(".tgz"));

  if (!tarball) {
    throw new Error("Package smoke failed: pnpm pack did not create a tarball.");
  }

  await writeFile(
    path.join(smokeDirectory, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
    "utf8"
  );
  const tarballPath = path.join(packDirectory, tarball);

  await assertPackageContents(tarballPath);
  await installPackedPackage(tarballPath, smokeDirectory);

  const version = await runPnpm(["exec", "towel-txt", "--version"], smokeDirectory);
  const expectedVersion = `towel-txt ${manifest.version}`;

  if (version.stdout.trim() !== expectedVersion) {
    throw new Error(`Package smoke failed: unexpected version output: ${version.stdout}`);
  }

  await writeFile(path.join(smokeDirectory, "input.md"), "# Package Smoke\n\nReady.", "utf8");
  await runPnpm(
    ["exec", "towel-txt", "input.md", "--output", "output.html", "--strict"],
    smokeDirectory
  );

  const html = await readFile(path.join(smokeDirectory, "output.html"), "utf8");

  if (!html.includes("<title>Package Smoke</title>")) {
    throw new Error("Package smoke failed: generated HTML did not include the expected title.");
  }
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

async function runPnpm(args, cwd) {
  return run(pnpmCommand, [...pnpmArgsPrefix, ...args], cwd);
}

async function installPackedPackage(tarballPath, cwd) {
  try {
    await runPnpm(["add", "--offline", tarballPath], cwd);
  } catch (error) {
    if (!isMissingOfflineMetadata(error)) {
      throw error;
    }

    await runPnpm(["add", tarballPath], cwd);
  }
}

function isMissingOfflineMetadata(error) {
  const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;

  return output.includes("ERR_PNPM_NO_OFFLINE_META");
}

async function assertPackageContents(tarballPath) {
  const entries = await listTarballEntries(tarballPath);
  const requiredEntries = [
    "package/package.json",
    "package/dist/cli.js",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/README.md",
    "package/LICENSE",
    "package/CHANGELOG.md",
    "package/docs/cli-reference.md",
    "package/docs/examples.md",
    "package/examples/report.md",
    "package/examples/images/workflow.svg"
  ];
  const missingEntries = requiredEntries.filter((entry) => !entries.includes(entry));

  if (missingEntries.length > 0) {
    throw new Error(
      `Package smoke failed: packed tarball is missing ${missingEntries.join(", ")}.`
    );
  }

  const generatedDistFiles = entries.filter((entry) =>
    /^package\/dist\/.*\.(?:html|json)$/u.test(entry)
  );

  if (generatedDistFiles.length > 0) {
    throw new Error(
      `Package smoke failed: packed tarball includes generated dist output ${generatedDistFiles.join(
        ", "
      )}.`
    );
  }
}

async function listTarballEntries(tarballPath) {
  const archive = await gunzipAsync(await readFile(tarballPath));
  const entries = [];
  let offset = 0;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const size = Number.parseInt(readTarString(header, 124, 12).trim() || "0", 8);
    const entryName = prefix ? `${prefix}/${name}` : name;

    if (entryName) {
      entries.push(entryName);
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return entries;
}

function readTarString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);

  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

async function run(command, args, cwd) {
  return execFileAsync(command, args, {
    cwd,
    env: process.env,
    windowsHide: true
  });
}
