# Release Process

Towel.txt release metadata is prepared for the first public `0.1.0` package.
Publishing still requires maintainer npm credentials.

1. Confirm `pnpm release:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
   `pnpm build`, `pnpm perf:smoke`, `pnpm security:audit`, and
   `pnpm smoke:package` pass.
2. Update `CHANGELOG.md`.
3. Bump `package.json` using semantic versioning.
4. Run `npm pack --dry-run` and confirm the file list only contains built
   runtime files, package metadata, docs, and examples.
5. Create a GitHub release with the changelog notes.
6. Publish the package from a clean checkout.

## GitHub Release Workflow

The `Release` workflow can run the release gate from GitHub Actions.

1. Update `package.json`, `src/meta.ts`, and `CHANGELOG.md` to the same release
   version.
2. Configure the repository secret `NPM_TOKEN` before enabling publish:

   ```bash
   gh secret set NPM_TOKEN --repo kaleab-kali/towel.txt
   ```

3. Run the maintainer preflight:

   ```bash
   pnpm release:preflight
   ```

4. Open the workflow from the Actions tab.
5. Enter the release version.
6. Leave `publish` disabled to run verification and package dry-run only.
7. Enable `publish` only when the release should publish to npm and create a
   GitHub release.

Publishing uses npm provenance from GitHub Actions and requires npm credentials
through `NPM_TOKEN`. The workflow fails before publishing when the token is
missing.
Release workflow runs are serialized per Git ref and the release job has a
20-minute timeout so overlapping or stalled release attempts fail predictably.
