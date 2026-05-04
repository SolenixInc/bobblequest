# Phase 04 — Config Schema

## Goal

Add `AnalyticsConfigSchema` to `@t/config` so the DI registrar has a typed, env-bound config object.
No hardcoded PostHog host, no ambient `process.env` reads scattered across infra.

## Blocked by

- Phase 01 — Package Skeleton.

## Blocks

- Phase 05 — PostHog implementation consumes this config.
- Phase 06 — DI registrar resolves config and passes to tracker ctor.

## Preconditions

- `packages/config/` exists with root `index.ts` (no `src/` yet).
- Bun@1.3.11 + Turbo toolchain wired; alias `@t/*` → `./packages/*/src` in `tsconfig.base.json`.
- Zod present as a workspace dep.

## Checklist — primary path (land in `@t/config`)

- [ ] Inspect `packages/config/` current layout. If it does NOT use `src/`, document why in a header
  comment and follow the existing convention (root `index.ts` re-exports). Do not silently invent a
  `src/` dir.
- [ ] Add `AnalyticsConfigSchema` (Zod):
  - [ ] `apiKey: z.string()` — public PostHog project key.
  - [ ] `personalApiKey: z.string()` — server-side flag eval key.
  - [ ] `host: z.string().url()` — e.g. `https://us.i.posthog.com`.
  - [ ] `enabled: z.boolean().default(true)`.
- [ ] Add an env-var resolver `resolveAnalyticsConfig()` that maps:
  - [ ] `POSTHOG_API_KEY` → `apiKey`
  - [ ] `POSTHOG_PERSONAL_API_KEY` → `personalApiKey`
  - [ ] `POSTHOG_HOST` → `host`
  - [ ] `POSTHOG_ENABLED` → `enabled` (coerced boolean)
- [ ] Export both `AnalyticsConfigSchema` and `resolveAnalyticsConfig` from the package's main
  export.
- [ ] Update root `.env.example` with all four keys, commented with safe example values.

## Checklist — fallback path (scope-gated)

Use ONLY if `@t/config` cannot accept new schemas this phase.

- [ ] Inline schema at `packages/analytics/src/entities/schemas/AnalyticsConfigSchema.ts`.
- [ ] Read env vars via `process.env` directly in `registerAnalyticsDI`.
- [ ] File a follow-up issue to extract the schema into `@t/config` in a later phase.

## Files touched (primary)

```text
packages/config/...AnalyticsConfigSchema.ts   (new)
packages/config/index.ts                      (add exports)
.env.example                                  (add 4 keys)
```

## Files touched (fallback)

```text
packages/analytics/src/entities/schemas/AnalyticsConfigSchema.ts   (new)
.env.example                                                       (add 4 keys)
```

## Verification

- [ ] Unit test (in owning package):
  - [ ] `AnalyticsConfigSchema.parse({})` rejects.
  - [ ] `parse({ apiKey, personalApiKey, host })` succeeds with `enabled: true` default.
  - [ ] `parse({ ..., host: "not-a-url" })` rejects.
- [ ] `bun test --filter config` (or `--filter analytics` on fallback) exits 0.
- [ ] `bun run tsc --noEmit` at root exits 0.

## Notes

- `personalApiKey` is DISTINCT from `apiKey`. Do not collapse them.
- Host defaults to US region in `.env.example` comments only — the schema MUST require it explicitly
  so EU/self-hosted deployments are a one-line change.
- Never hardcode `https://us.i.posthog.com` inside `PostHogAnalyticsTrackerImpl`.
- The `@t/config` package name is canonical — NEVER `@t/config`.
- Zod `.default(true)` on `enabled` means callers can omit it; the resolver must still coerce
  `POSTHOG_ENABLED="false"` correctly.
