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
