# Phase 01 — Package Skeleton

## Goal

Stand up `packages/analytics/` as a resolvable `@t/analytics` workspace package with the right
directory structure, `package.json`, and `tsconfig.json`. Produces an importable but mostly-empty
module that later phases fill in.

## Blocked by

None.

## Blocks

02, 03, 04, 05, 06, 07, 08.

## Preconditions

- Repo root has `bun.lock` (note: `bun.lock`, not `bun.lockb`), `bunfig.toml`, `tsconfig.base.json`,
  `turbo.json`.
- `tsconfig.base.json` already defines `compilerOptions.paths` with `@t/*` → `./packages/*/src`. The
  package's sources must therefore live under `packages/analytics/src/` to be resolvable via the
  alias.
- `packages/analytics/` already partially exists (with `dependency-injection/`, `entities/`,
  `infrastructure/`, `utils/`, `index.ts`) at the **package root** — not yet under `src/`. **Do not
  delete existing files in this phase** — later phases supersede the old `*AnalyticsClient*` files.

## Checklist

- [ ] `ls packages/analytics/` — inventory what's there today.
- [ ] Restructure existing source from `packages/analytics/` root into `packages/analytics/src/` so
  the `@t/*` alias resolves correctly. Move `dependency-injection/`, `entities/`, `infrastructure/`,
  `utils/`, and `index.ts` under `src/`. Leave `package.json`, `tsconfig.json`, `README.md`, and any
  config files at the package root.
- [ ] Create `packages/analytics/package.json`:
  - `"name": "@t/analytics"`
  - `"version": "0.0.0"`
  - `"type": "module"`
  - `"main": "./src/index.ts"` (or `"exports"` map if the rest of the repo uses exports)
  - `"dependencies"`: `posthog-node`, `zod`
  - `"peerDependencies"`: `awilix` (if DI is shared across packages via peer dep)
  - `"devDependencies"`: `@types/node` (Vitest is added in Phase 07 — see Notes)
- [ ] Create `packages/analytics/tsconfig.json` extending `../../tsconfig.base.json`.
- [ ] Ensure `packages/analytics/src/index.ts` exists (leave as an empty placeholder re-export
  block; later phases populate it).
- [ ] Ensure these subdirectories exist under `src/` (create if missing, `.gitkeep` if empty):
  - `src/entities/ports/`
  - `src/entities/schemas/`
  - `src/entities/types/`
  - `src/infrastructure/`
  - `src/dependency-injection/`
  - `tests/` (sibling of `src/`, at package root)
- [ ] Confirm root `package.json` workspaces glob (`packages/*`) covers analytics — it almost
  certainly already does.
- [ ] Run `bun install` at repo root.

## Files touched

- `packages/analytics/package.json` (create; name = `@t/analytics`)
- `packages/analytics/tsconfig.json` (create)
- `packages/analytics/src/` (new directory; move existing root files into here)
- `packages/analytics/src/index.ts` (ensure exists)
- `packages/analytics/tests/` (create empty)
- `.gitkeep` files in any empty subdirectories

## Verification

```bash
bun install
cd packages/analytics && bun run tsc --noEmit
```

Both exit 0. From any other package in the monorepo, this import must resolve with no TS error:

```ts
import type {} from "@t/analytics";
```

## Notes

- Do NOT add `posthog-js` or `posthog-react-native` here — those are for UI apps (Phase 2).
- Alias style: `@t/*` → `./packages/*/src`, as already defined in
  `tsconfig.base.json#compilerOptions.paths`. Do not invent a new style.
- Old `*AnalyticsClient*` files (and any Deno-style imports like `@posthog` or `@/di`) stay where
  they are in phase 01 — they are renamed / superseded in phases 03 and 05. Do not touch them here
  beyond the bulk move into `src/`.
- Vitest is NOT yet present at the repo root. Phase 07 is responsible for introducing it (either as
  a root-level shared dev-dependency or per-package). This phase should not add it preemptively.
- Other existing packages (`@t/config`, `@t/logging`, `@t/billing`, `@t/errors`, `@t/db`) already
  live in `packages/` — mirror their `package.json` shape where sensible.
- If the old `packages/analytics/package.json` already exists with wrong contents, back it up
  (rename to `package.json.bak`) rather than deleting — preserves history during the migration.
