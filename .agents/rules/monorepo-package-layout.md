---
paths:
  - "packages/**"
---

**Applies to:** File/folder convention for every package under `packages/**`.

- **Root config files only** (no source): `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `bunfig.toml`, `biome.json`, and similar.
- **All source lives under `src/`**, organized by Clean Architecture:
  - `src/entities/` — ports, schemas, types
  - `src/infrastructure/` — concrete implementations
  - `src/dependency-injection/` — DI registrars
  - `src/utils/` — utilities (if needed)
- **Tests mirror `src/`** under top-level `tests/` directory, one-to-one. Example: `src/infrastructure/Foo.ts` → `tests/infrastructure/Foo.test.ts`. Behavior suites that span multiple source files live at the nearest common ancestor (e.g. `tests/infrastructure/construction.test.ts`).
- **Test scaffolding** (`tests/setup/`) has no `src/` mirror requirement.
- **Progressive disclosure:** prefer many small, single-purpose files over one monolith. Nest as deep as the domain justifies.
- **Test file naming:** `<SourceFile>.test.ts` by default; behavior-suite names (e.g. `construction.test.ts`) allowed when the suite is not tied to a single source file.
- **`packages/config/` is the one exception** — it holds only config-artifact files, no runtime code, so it does not use `src/`.
