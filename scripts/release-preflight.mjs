import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultNpmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const defaultNpmArgsPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd"] : [];
const defaultRepository = "kaleab-kali/towel.txt";
const defaultBranch = "main";
const defaultRequiredContexts = [
  "Analyze JavaScript and TypeScript",
  "CodeQL",
  "verify (ubuntu-latest, 20)",
  "verify (ubuntu-latest, 22)",
  "verify (windows-latest, 22)"
];

if (isCliEntryPoint()) {
  const result = await runReleasePreflight();

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      process.stderr.write(`Warning: ${warning}\n`);
    }
  }

  if (result.failures.length > 0) {
    console.error("Release preflight failed:");

    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }

    process.exit(1);
  }

  process.stdout.write("Release preflight passed.\n");
}

export async function runReleasePreflight(options = {}) {
  const packageRoot = options.packageRoot ?? defaultPackageRoot;
  const manifest =
    options.manifest ?? JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const state = {
    branch: options.branch ?? defaultBranch,
    failures: [],
    manifest,
    npmArgsPrefix: options.npmArgsPrefix ?? defaultNpmArgsPrefix,
    npmCommand: options.npmCommand ?? defaultNpmCommand,
    repository: options.repository ?? defaultRepository,
    requiredContexts: options.requiredContexts ?? defaultRequiredContexts,
    runCommand: options.runCommand ?? createCommandRunner(packageRoot),
    warnings: []
  };

  await checkRepositoryMetadata(state);
  await checkBranchProtection(state);
  await checkMainWorkflowRuns(state);
  await checkNpmPackageState(state);

  return {
    failures: state.failures,
    warnings: state.warnings
  };
}

function isCliEntryPoint() {
  const entry = process.argv[1];

  return entry ? import.meta.url === pathToFileURL(path.resolve(entry)).href : false;
}

async function checkRepositoryMetadata(state) {
  const repo = await runJson(state, "gh", [
    "repo",
    "view",
    state.repository,
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

  expect(state, repo.isPrivate === false, "GitHub repository must be public.");
  expect(
    state,
    repo.defaultBranchRef?.name === state.branch,
    "GitHub default branch must be main."
  );
  expect(
    state,
    repo.description === state.manifest.description,
    "GitHub repository description must match package.json."
  );
  expect(
    state,
    repo.homepageUrl === state.manifest.homepage,
    "GitHub repository homepage must point to the README."
  );
  expect(state, repo.licenseInfo?.key === "mit", "GitHub repository license must be MIT.");
  expect(state, repo.hasIssuesEnabled === true, "GitHub issues must be enabled.");
  expect(state, repo.mergeCommitAllowed === true, "GitHub merge commits must be enabled.");
  expect(state, repo.squashMergeAllowed === false, "GitHub squash merges must be disabled.");
  expect(state, repo.rebaseMergeAllowed === false, "GitHub rebase merges must be disabled.");
  expect(state, repo.deleteBranchOnMerge === false, "GitHub branch auto-delete must be disabled.");

  const topics = (repo.repositoryTopics ?? []).map((topic) => topic.name);
  const requiredTopics = ["markdown", "cli", "html", "pdf", "typescript", "documents"];
  const missingTopics = requiredTopics.filter((topic) => !topics.includes(topic));

  expect(
    state,
    missingTopics.length === 0,
    `GitHub repository topics must include ${missingTopics.join(", ")}.`
  );
}

async function checkBranchProtection(state) {
  const protection = await runJson(state, "gh", [
    "api",
    `repos/${state.repository}/branches/${state.branch}/protection`
  ]);
  const contexts = protection.required_status_checks?.contexts ?? [];
  const missingContexts = state.requiredContexts.filter((context) => !contexts.includes(context));

  expect(
    state,
    protection.required_status_checks?.strict === true,
    "main branch protection must require branches to be up to date before merging."
  );
  expect(
    state,
    missingContexts.length === 0,
    `main branch protection must require ${missingContexts.join(", ")}.`
  );
  expect(
    state,
    protection.allow_force_pushes?.enabled === false,
    "main branch protection must reject force pushes."
  );
  expect(
    state,
    protection.allow_deletions?.enabled === false,
    "main branch protection must reject branch deletion."
  );
  expect(
    state,
    protection.required_conversation_resolution?.enabled === true,
    "main branch protection must require conversation resolution."
  );
}

async function checkMainWorkflowRuns(state) {
  const runs = await runJson(state, "gh", [
    "run",
    "list",
    "--branch",
    state.branch,
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

    expect(state, run !== undefined, `${workflowName} must have a recent main branch run.`);

    if (run) {
      expect(
        state,
        run.status === "completed" && run.conclusion === "success",
        `${workflowName} latest main branch run must be successful.`
      );
    }
  }
}

async function checkNpmPackageState(state) {
  const result = await state.runCommand(
    state.npmCommand,
    [...state.npmArgsPrefix, "view", state.manifest.name, "version", "--json"],
    {
      allowFailure: true
    }
  );

  if (result.exitCode !== 0) {
    const output = `${result.stdout}\n${result.stderr}`;

    if (output.includes("E404") || output.includes("404 Not Found")) {
      return;
    }

    fail(state, `npm registry lookup for ${state.manifest.name} failed.`);
    return;
  }

  let publishedVersion;

  try {
    publishedVersion = JSON.parse(result.stdout);
  } catch {
    fail(state, `npm registry lookup for ${state.manifest.name} returned invalid JSON.`);
    return;
  }

  if (publishedVersion === state.manifest.version) {
    fail(
      state,
      `npm package ${state.manifest.name}@${state.manifest.version} is already published.`
    );
  } else {
    state.warnings.push(
      `npm package ${state.manifest.name} already exists at ${publishedVersion}; verify this is expected.`
    );
  }
}

async function runJson(state, command, args) {
  const result = await state.runCommand(command, args);

  if (result.exitCode !== 0) {
    fail(state, `${command} ${args.join(" ")} failed.`);
    return {};
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(state, `${command} ${args.join(" ")} did not return valid JSON.`);
    return {};
  }
}

function createCommandRunner(packageRoot) {
  return async function run(command, args, options = {}) {
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

      return {
        exitCode: 1,
        stdout: String(error.stdout ?? ""),
        stderr: String(error.stderr ?? "")
      };
    }
  };
}

function expect(state, condition, message) {
  if (!condition) {
    fail(state, message);
  }
}

function fail(state, message) {
  state.failures.push(message);
}
