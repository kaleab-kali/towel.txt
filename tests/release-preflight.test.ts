import { describe, expect, it } from "vitest";

type CommandOptions = {
  allowFailure?: boolean;
};

type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

type CommandRunner = (
  command: string,
  args: string[],
  options?: CommandOptions
) => Promise<CommandResult>;

type Manifest = {
  description: string;
  homepage: string;
  name: string;
  version: string;
};

type ReleasePreflight = {
  runReleasePreflight: (options: {
    manifest: Manifest;
    npmArgsPrefix?: string[];
    npmCommand?: string;
    runCommand: CommandRunner;
  }) => Promise<{ failures: string[]; warnings: string[] }>;
};

const manifest = {
  description: "Convert Markdown into printable HTML and PDF documents.",
  homepage: "https://github.com/kaleab-kali/towel.txt#readme",
  name: "towel-txt",
  version: "0.1.0"
};

describe("release preflight", () => {
  it("passes when repository, branch protection, workflows, and npm state are ready", async () => {
    const { runReleasePreflight } = await loadPreflight();
    const result = await runReleasePreflight({
      manifest,
      npmCommand: "npm",
      runCommand: createCommandRunner()
    });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("reports when the current package version is already published", async () => {
    const { runReleasePreflight } = await loadPreflight();
    const result = await runReleasePreflight({
      manifest,
      npmCommand: "npm",
      runCommand: createCommandRunner({ npm: publishedVersion(manifest.version) })
    });

    expect(result.failures).toContain("npm package towel-txt@0.1.0 is already published.");
  });

  it("reports unsuccessful latest workflow runs", async () => {
    const { runReleasePreflight } = await loadPreflight();
    const result = await runReleasePreflight({
      manifest,
      npmCommand: "npm",
      runCommand: createCommandRunner({
        runs: [
          workflowRun("CI", "completed", "failure"),
          workflowRun("CodeQL"),
          workflowRun("Release")
        ]
      })
    });

    expect(result.failures).toContain("CI latest main branch run must be successful.");
  });
});

async function loadPreflight() {
  return (await import("../scripts/release-preflight.mjs")) as ReleasePreflight;
}

function createCommandRunner(overrides: Partial<MockResponses> = {}): CommandRunner {
  const responses = {
    npm: unpublishedPackage(),
    protection: protectedBranch(),
    repository: publicRepository(),
    runs: [workflowRun("CI"), workflowRun("CodeQL"), workflowRun("Release")],
    ...overrides
  };

  return async (command, args) => {
    if (command === "gh" && args[0] === "repo") {
      return ok(responses.repository);
    }

    if (command === "gh" && args[0] === "api") {
      return ok(responses.protection);
    }

    if (command === "gh" && args[0] === "run") {
      return ok(responses.runs);
    }

    if (command === "npm") {
      return responses.npm;
    }

    return { exitCode: 1, stderr: "unexpected command", stdout: "" };
  };
}

type MockResponses = {
  npm: CommandResult;
  protection: unknown;
  repository: unknown;
  runs: unknown[];
};

function publicRepository() {
  return {
    defaultBranchRef: { name: "main" },
    deleteBranchOnMerge: false,
    description: manifest.description,
    hasIssuesEnabled: true,
    homepageUrl: manifest.homepage,
    isPrivate: false,
    licenseInfo: { key: "mit" },
    mergeCommitAllowed: true,
    rebaseMergeAllowed: false,
    repositoryTopics: [
      { name: "cli" },
      { name: "documents" },
      { name: "html" },
      { name: "markdown" },
      { name: "pdf" },
      { name: "typescript" }
    ],
    squashMergeAllowed: false
  };
}

function protectedBranch() {
  return {
    allow_deletions: { enabled: false },
    allow_force_pushes: { enabled: false },
    required_conversation_resolution: { enabled: true },
    required_status_checks: {
      contexts: [
        "Analyze JavaScript and TypeScript",
        "CodeQL",
        "verify (ubuntu-latest, 20)",
        "verify (ubuntu-latest, 22)",
        "verify (windows-latest, 22)"
      ],
      strict: true
    }
  };
}

function workflowRun(workflowName: string, status = "completed", conclusion = "success") {
  return {
    conclusion,
    headSha: "abc123",
    status,
    workflowName
  };
}

function unpublishedPackage() {
  return {
    exitCode: 1,
    stderr: "npm error code E404",
    stdout: '{"error":{"code":"E404"}}'
  };
}

function publishedVersion(version: string) {
  return {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify(version)
  };
}

function ok(value: unknown) {
  return {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify(value)
  };
}
