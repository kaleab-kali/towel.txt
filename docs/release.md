# Release Process

Towel.txt is not published yet. Use this process once the Printable HTML MVP is
ready for release.

1. Confirm `pnpm release:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
   `pnpm build`, and `pnpm smoke:package` pass.
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
2. Open the workflow from the Actions tab.
3. Enter the release version.
4. Leave `publish` disabled to run verification and package dry-run only.
5. Enable `publish` only when the release should publish to npm and create a
   GitHub release.

Publishing requires npm credentials through `NPM_TOKEN` or an equivalent trusted
publishing setup for this repository.
