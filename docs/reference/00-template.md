# Reference template

**Quadrant:** Reference — information-oriented. Dry, accurate, complete, structured. The reader
is looking something up, not learning.

---

## What this file is for

This template defines the standard format for every reference document in `docs/reference/`. Use
it when hand-writing reference material that cannot or has not yet been auto-generated.

## When to update it

- The team adopts or changes the auto-generation toolchain.
- A new mandatory field is added to all reference entries (e.g., a "Stability" flag).
- A related ADR changes reference documentation policy.

---

### Why this file exists

Reference docs must be **accurate above all else**. A reader consulting reference material has a
specific fact to retrieve — a config key, a port, a script name. They are not here to learn; they
are here to confirm.

#### Auto-generation is strongly preferred

Most reference material in this codebase should be **auto-generated**, not hand-written.
Hand-written reference drifts; generated reference tracks the code automatically.

| Source of truth | Toolchain | Output |
| --- | --- | --- |
| Zod schemas (`packages/config/entities/schemas/`) | `<TBD-codegen>` | `docs/reference/env-vars.md` |
| tRPC routers (`apps/api/src/router.ts`) | `<TBD: trpc-panel \| trpc-ui \| trpc-openapi>` | `docs/reference/trpc-api.md` |
| Drizzle schema (`packages/db/src/schema.ts`) | `drizzle-kit introspect` + custom | `docs/reference/database-schema.md` |

Run `<TBD-reference-gen-command>` to regenerate. CI should enforce that generated docs are up to
date.

When a section of reference material cannot be auto-generated (env vars, config file format,
deployment flags), use the hand-written template below.

---

### Worked example

The excerpt below mirrors the shape used in `docs/reference/scripts.md`.

```markdown
## apps/api

| Script | Description |
| --- | --- |
| `dev` | Run the API server with hot-reload via `bun --hot`. Loads `.env` from the repo root. |
| `build` | Bundle `src/index.ts` to `dist/` targeting Node. |
| `start` | Run the production bundle (`dist/index.js`). |
| `worker` | Run the background job worker (`src/worker.ts`). |
| `worker:dev` | Run the background job worker with watch-mode reload. |
| `cron` | Run the cron runner (`src/cron.ts`). |
| `check` | Run Biome linter/formatter check (no writes). |
| `format` | Run Biome linter/formatter with auto-fix writes. |
| `typecheck` | Run `tsc --noEmit` (type-check only, no emit). |
| `test` | Run Vitest in CI mode (single pass). |
| `test:watch` | Run Vitest in interactive watch mode. |
| `test:coverage` | Run Vitest with V8 coverage report. |
| `size` | Run `size-limit` bundle-size check. |
```

---

### Fill-in scaffold

Copy this block for each section you need to document by hand. Delete every `<!-- -->` comment
before publishing.

```markdown
## `<name>`

<!-- One sentence: what this item is or does. -->

**Location:** `<path or package>`
**Since:** v<X.Y.Z>
**Stability:** <!-- stable | experimental | deprecated -->

### Details

<!-- Prose or table describing the item. -->

| Field | Value |
| --- | --- |
| `<key>` | <!-- description --> |

### Example

<!-- Minimal working code or command snippet. -->

### See also

<!-- Cross-links: related items, how-to guides, explanation docs, ADRs. -->
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
