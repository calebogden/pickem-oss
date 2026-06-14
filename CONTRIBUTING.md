# Contributing to pickem

Thanks for your interest in improving pickem! This is a small, focused library —
a usage-sorted, searchable picker for CLI tools — and contributions of all sizes
are welcome.

## Development setup

```bash
git clone https://github.com/calebogden/pickem-oss
cd pickem-oss
npm ci
```

## Checks

Run these before opening a pull request — CI runs the same on Node 18, 20, and 22:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # compile to dist/
```

All tests must pass and the type-check must be clean.

## Conventions

- **TypeScript, ESM-only.** No CommonJS, no default exports from the package root.
- **Zero runtime dependencies.** Please don't add a production dependency without
  opening an issue to discuss it first.
- **Tests are required** for behavior changes — add or update specs under `tests/`.
- **Match the surrounding style.** Keep comments purposeful and the diff focused.
- Conventional-style commit messages (`fix:`, `feat:`, `docs:`, …) are appreciated.

## Pull requests

1. Open an issue first for anything non-trivial, so we can agree on the approach.
2. Keep PRs small and single-purpose.
3. Describe what changed and why, and include test coverage.

## Reporting bugs

Open an issue at
[github.com/calebogden/pickem-oss/issues](https://github.com/calebogden/pickem-oss/issues)
with a minimal reproduction (the smallest snippet that shows the problem), what
you expected, and what happened instead.

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
