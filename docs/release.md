# Release Process

Towel.txt is not published yet. Use this process once the Printable HTML MVP is
ready for release.

1. Confirm `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
2. Update `CHANGELOG.md`.
3. Bump `package.json` using semantic versioning.
4. Create a GitHub release with the changelog notes.
5. Publish the package from a clean checkout.
