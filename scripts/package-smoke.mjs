import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpmExecPath = process.env.npm_execpath;
const pnpmRunsThroughNode = pnpmExecPath ? /\.(?:cjs|js|mjs)$/iu.test(pnpmExecPath) : false;
const pnpmCommand = pnpmRunsThroughNode ? process.execPath : (pnpmExecPath ?? "pnpm");
const pnpmArgsPrefix = pnpmRunsThroughNode && pnpmExecPath ? [pnpmExecPath] : [];

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
  await installPackedPackage(path.join(packDirectory, tarball), smokeDirectory);

  const version = await runPnpm(["exec", "towel-txt", "--version"], smokeDirectory);

  if (!version.stdout.includes("towel-txt 0.0.0")) {
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

async function run(command, args, cwd) {
  return execFileAsync(command, args, {
    cwd,
    env: process.env,
    windowsHide: true
  });
}
