const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const oidcToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? "";
const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL ?? "";

if (!isGitHubActions || !oidcToken.trim() || !oidcUrl.trim()) {
  console.error(
    "Publish prerequisite check failed: GitHub Actions OIDC is unavailable. Ensure the Release workflow has id-token: write and npm Trusted Publishing is configured for this package."
  );
  process.exit(1);
}

process.stdout.write("Trusted Publishing prerequisites verified.\n");
