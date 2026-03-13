# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A GitHub Action (TypeScript) that lists monorepo packages containing changed files in a PR. It diffs against `origin/main`, finds all `package.json` files, and outputs which packages have changes. Designed for pnpm/npm/yarn/bun monorepos.

## Commands

- **Install**: `npm install`
- **Test**: `npm test` (requires `NODE_OPTIONS=--experimental-vm-modules`)
- **Single test**: `NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1 npx jest __tests__/getChangedPackages.test.ts`
- **Lint**: `npm run lint`
- **Format**: `npm run format:write` (prettier)
- **Bundle**: `npm run bundle` (format + package)
- **Package only**: `npm run package` (rollup → `dist/`)
- **Local run**: `npm run local-action` (uses `.env` file, see `.env.example`)

## Architecture

- `src/index.ts` → entrypoint, calls `run()`
- `src/main.ts` → `run()` orchestrates the action: calls `getChangedPackages()`, sets GitHub Action outputs
- `src/getChangedPackages.ts` → core logic:
    - `getChangedFiles()` — runs `git diff --name-only` against merge-base with origin/main, excludes `docs/` paths and `.md` files
    - `findPackages()` — recursively finds all `package.json` files (skips `node_modules`, `dist`, `.git`)
    - `isFileInPackage()` — checks if a file path falls within a package directory
    - `getChangedPackages()` — combines the above, filters out `monorepo-root`

Tests are in `__tests__/`, fixtures in `__fixtures__/`. Jest with ts-jest in ESM mode.

## Key Details

- The `dist/` directory contains generated JS and **must be kept in sync** with `src/` — a CI workflow (`check-dist.yml`) enforces this. Run `npm run bundle` after changing source files.
- Uses `@actions/core` for logging (not `console`), as required by GitHub Actions.
- Node.js >= 24.0.0. Rollup bundles everything into `dist/index.js`.
- Versioning follows semver; update `package.json` version when making changes.
