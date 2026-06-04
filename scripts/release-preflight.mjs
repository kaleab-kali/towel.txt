import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmArgsPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd"] : [];
const repository = "kaleab-kali/towel.txt";
const branch = "main";
const requiredContexts = [
  "Analyze JavaScript and TypeScript",
  "CodeQL",
  "verify (ubuntu-latest, 20)",
  "verify (ubuntu-latest, 22)",
  "verify (windows-latest, 22)"
];
const failures = [];
const warnings = [];
const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

await checkRepositoryMetadata();
await checkBranchProtection();
await checkMainWorkflowRuns();
await checkNpmSecret();
await checkNpmPackageState();

if (warnings.length > 0) {
  for (const warning of warnings) {
    process.stderr.write(`Warning: ${warning}\n`);
  }
}

if (failures.length > 0) {
  console.error("Release preflight failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

process.stdout.write("Release preflight passed.\n");

async function checkRepositoryMetadata() {
  const repo = await runJson("gh", [
    "repo",
    "view",
    repository,
    "--json",
    [
      "defaultBranchRef",
      "deleteBranchOnMerge",
      "description",
      "hasIssuesEnabled",
      "homepageUrl",
      "isPrivate",
      "licenseInfo",
      "mergeCommitAllowed",
      "rebaseMergeAllowed",
      "repositoryTopics",
      "squashMergeAllowed"
    ].join(",")
  ]);

  expect(repo.isPrivate === false, "GitHub repository must be public.");
  expect(repo.defaultBranchRef?.name === branch, "GitHub default branch must be main.");
  expect(
    repo.description === manifest.description,
    "GitHub repository description must match package.json."
  );
  expect(
    repo.homepageUrl === manifest.homepage,
    "GitHub repository homepage must point to the README."
  );
  expect(repo.licenseInfo?.key === "mit", "GitHub repository license must be MIT.");
  expect(repo.hasIssuesEnabled === true, "GitHub issues must be enabled.");
  expect(repo.mergeCommitAllowed === true, "GitHub merge commits must be enabled.");
  expect(repo.squashMergeAllowed === false, "GitHub squash merges must be disabled.");
  expect(repo.rebaseMergeAllowed === false, "GitHub rebase merges must be disabled.");
  expect(repo.deleteBranchOnMerge === false, "GitHub branch auto-delete must be disabled.");

  const topics = (repo.repositoryTopics ?? []).map((topic) => topic.name);
  const requiredTopics = ["markdown", "cli", "html", "pdf", "typescript", "documents"];
  const missingTopics = requiredTopics.filter((topic) => !topics.includes(topic));

  expect(
    missingTopics.length === 0,
    `GitHub repository topics must include ${missingTopics.join(", ")}.`
  );
}

async function checkBranchProtection() {
  const protection = await runJson("gh", [
    "api",
    `repos/${repository}/branches/${branch}/protection`
  ]);
  const contexts = protection.required_status_checks?.contexts ?? [];
  const missingContexts = requiredContexts.filter((context) => !contexts.includes(context));

  expect(
    protection.required_status_checks?.strict === true,
    "main branch protection must require branches to be up to date before merging."
  );
  expect(
    missingContexts.length === 0,
    `main branch protection must require ${missingContexts.join(", ")}.`
  );
  expect(
    protection.allow_force_pushes?.enabled === false,
    "main branch protection must reject force pushes."
  );
  expect(
    protection.allow_deletions?.enabled === false,
    "main branch protection must reject branch deletion."
  );
  expect(
    protection.required_conversation_resolution?.enabled === true,
    "main branch protection must require conversation resolution."
  );
}

async function checkMainWorkflowRuns() {
  const runs = await runJson("gh", [
    "run",
    "list",
    "--branch",
    branch,
    "--limit",
    "10",
    "--json",
    "conclusion,headSha,status,workflowName"
  ]);
  const latestByWorkflow = new Map();

  for (const run of runs) {
    if (!latestByWorkflow.has(run.workflowName)) {
      latestByWorkflow.set(run.workflowName, run);
    }
  }

  for (const workflowName of ["CI", "CodeQL", "Release"]) {
    const run = latestByWorkflow.get(workflowName);

    expect(run !== undefined, `${workflowName} must have a recent main branch run.`);

    if (run) {
      expect(
        run.status === "completed" && run.conclusion === "success",
        `${workflowName} latest main branch run must be successful.`
      );
    }
  }
}

async function checkNpmSecret() {
  const result = await run("gh", ["secret", "list", "--repo", repository]);
  const secretNames = result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u)[0])
    .filter(Boolean);

  expect(secretNames.includes("NPM_TOKEN"), "GitHub Actions secret NPM_TOKEN must be configured.");
}

async function checkNpmPackageState() {
  const result = await run(
    npmCommand,
    [...npmArgsPrefix, "view", manifest.name, "version", "--json"],
    {
      allowFailure: true
    }
  );

  if (result.exitCode !== 0) {
    const output = `${result.stdout}\n${result.stderr}`;

    if (output.includes("E404") || output.includes("404 Not Found")) {
      return;
    }

    fail(`npm registry lookup for ${manifest.name} failed.`);
    return;
  }

  const publishedVersion = JSON.parse(result.stdout);

  if (publishedVersion === manifest.version) {
    fail(`npm package ${manifest.name}@${manifest.version} is already published.`);
  } else {
    warnings.push(
      `npm package ${manifest.name} already exists at ${publishedVersion}; verify this is expected.`
    );
  }
}

async function runJson(command, args) {
  const result = await run(command, args);

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(`${command} ${args.join(" ")} did not return valid JSON.`);
    return {};
  }
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: packageRoot,
      env: process.env,
      windowsHide: true
    });

    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (options.allowFailure) {
      return {
        exitCode: Number.isInteger(error.code) ? error.code : 1,
        stdout: String(error.stdout ?? ""),
        stderr: String(error.stderr ?? "")
      };
    }

    fail(`${command} ${args.join(" ")} failed.`);
    return {
      exitCode: 1,
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? "")
    };
  }
}

function expect(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function fail(message) {
  failures.push(message);
}
