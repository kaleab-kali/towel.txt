# Contributing

Thanks for helping improve Towel.txt. This project is intentionally small: each change
should be easy to review, test, and explain.

## Local setup

```bash
pnpm install
pnpm build
pnpm test
```

## Development workflow

1. Open an issue for behavior changes or larger refactors.
2. Create a focused branch from `main`.
3. Keep commits small and descriptive.
4. Add or update tests for changed behavior.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
6. Open a pull request with a clear summary and verification notes.

## Pull request standards

- Explain the user-visible behavior changed by the PR.
- Include screenshots or generated example output when print styling changes.
- Keep unrelated refactors out of feature and fix PRs.
- Do not commit generated files unless they are examples or release artifacts.
