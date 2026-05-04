---
name: dependency-injection bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/dependency-injection/** or any DI registrar MUST update this file and docs/prd-status/matrix.md
---

# @t/dependency-injection — bootstrap status

**Package status:** 🟢

## Changelog

- **2026-04-26 — Package flipped to 🟢 complete.** Platform doc expanded to canonical reference
  (`docs/architecture/platform/dependency-injection.md`); package README created
  (`packages/dependency-injection/README.md`); token snapshot test added
  (`packages/dependency-injection/tests/dependencyKeys.test.ts`); cross-references reconciled across
  prd-status docs.
- **2026-04-24 — AUTH and LOGGER tokens hoisted.** `dependencyKeys.global` now includes `AUTH` and
  `LOGGER` alongside the existing `CONFIG` / `LOGGER_FACTORY` / `ANALYTICS` / `CACHE` / `DB` /
  `USER_REPOSITORY` / `EMBEDDING_STORE` / `BILLING_REPOSITORY`. `@t/auth` (`AUTH_DI_KEY` local
  literal) and `@t/logging` (`'logger'` local literal in `registerLoggerDI`) now alias the canonical
  tokens. Both local TODOs cleared. `@t/errors` has no DI surface and is intentionally skipped.
- **2026-04-24 — DI tokens hoisted for cache/db/billing.** `dependencyKeys.global` now includes
  `CACHE`, `DB`, `USER_REPOSITORY`, `EMBEDDING_STORE`, `BILLING_REPOSITORY` alongside the
  pre-existing `CONFIG` / `LOGGER_FACTORY` / `ANALYTICS`. `@t/cache`, `@t/db`, and `@t/billing`
  local `*_DEPENDENCY_KEY` exports now alias the canonical tokens. `@t/auth` (`AUTH_DI_KEY` local
  literal) and `@t/logging` (`'logger'` local literal in `registerLoggerDI`) token hoists are still
  pending and carry TODO markers in their respective registrars. `@t/errors` has no DI surface and
  is intentionally skipped. Composition-root wiring in `apps/api` remains the blocker for every
  registrar.

## Intended

- Awilix container + dependency keys; foundation for every other package's registrar
- Single source of truth for DI tokens grouped by lifetime (`global` singletons, `request` scoped)
- Canonical re-export of Awilix primitives (`createContainer`, `asClass`, `asFunction`, `asValue`,
  `InjectionMode`, `Lifetime`) + `lifetimeConfig` options-bag constants
- Monorepo-wide `Container` type alias for `register*DI(container)` signatures

## Actual

- `src/entities/dependencyKeys.ts` — token registry (10 global + 1 request):
  - `global.CONFIG` ✓
  - `global.LOGGER_FACTORY` ✓
  - `global.LOGGER` ✓
  - `global.ANALYTICS` ✓
  - `global.AUTH` ✓
  - `global.CACHE` ✓ (hoisted 2026-04-24)
  - `global.DB` ✓ (hoisted 2026-04-24)
  - `global.USER_REPOSITORY` ✓ (hoisted 2026-04-24)
  - `global.EMBEDDING_STORE` ✓ (hoisted 2026-04-24)
  - `global.BILLING_REPOSITORY` ✓ (hoisted 2026-04-24)
  - `request.REQUEST_ANALYTICS` ✓
- `src/infrastructure/container.ts` — Awilix re-exports + `lifetimeConfig`
  (`SINGLETON`/`SCOPED`/`TRANSIENT`) + `Container` type alias (`AwilixContainer`)
- `src/index.ts` — barrel re-exporting the above
- `package.json` — private workspace pkg, ESM-only, `awilix@^12`, Biome + tsc scripts
- `README.md` — package README created 2026-04-26
- tests/
  - `tests/dependencyKeys.test.ts` — token shape snapshot test (added 2026-04-26)
- All 8 registrars (`registerConfigRepo`, `registerLoggerFactoryDI`, `registerLoggerDI`,
  `registerCacheDI`, `registerDbDI`, `registerAuthDI`, `registerAnalyticsDI`, `registerBillingDI`)
  reference canonical tokens; local literal aliases retained for backward compatibility.
- No composition-root / bootstrap helper (e.g. `createAppContainer()`) — each app wires its own.
  `apps/api` composition root (`src/composition.ts#buildContainer()`) wires all 10 tokens; 11
  smoke-test cases pass (10 resolves + 1 negative). `apps/web`, `apps/mobile`, `apps/desktop`
  composition roots still pending.

## Consumer hooks

- `import { createContainer, InjectionMode } from '@t/dependency-injection'` → construct container
- `import { asClass, asFunction, asValue, lifetimeConfig } from '@t/dependency-injection'` →
  register resolvers
- `import { dependencyKeys } from '@t/dependency-injection'` → resolve by canonical token
  (`container.resolve(dependencyKeys.global.CONFIG)`)
- `import type { Container, AwilixContainer, Resolver } from '@t/dependency-injection'` → typed
  registrar signatures

## Gaps vs docs

**CLOSED:**

- `docs/architecture/platform/dependency-injection.md` — CLOSED (2026-04-26). Doc now exists; see
  [../../architecture/platform/dependency-injection.md](../../architecture/platform/dependency-injection.md).
- `docs/prd-status/matrix.md` — CLOSED (matrix.md exists; DI row links to this doc).
- In-package tests — CLOSED (2026-04-26). `tests/dependencyKeys.test.ts` snapshot test added.
- Composition-root gap for `apps/api` — CLOSED (2026-04-25).
  `apps/api/src/composition.ts#buildContainer()` wires all 10 tokens; 11 smoke-test cases pass.

**OPEN:**

- Composition roots for `apps/web`, `apps/mobile`, `apps/desktop` — still pending (each app must
  instantiate its own Awilix container).
- Package rename consideration: on-disk package scope is `@t/dependency-injection`; PRD and some
  docs use `@t/*` shortform. Confirm uniform convention across workspace before closing.
- `request.REQUEST_ANALYTICS` — request-scope middleware for this token not yet implemented in any
  app.

## Notes for next agent

- Add tokens to `dependencyKeys` BEFORE wiring a new `register*DI` in a consumer package; update
  this file and `matrix.md` in the same change.
- Tokens are string literals — keep `as const` so `typeof dependencyKeys.global.X` narrows to the
  literal for resolver typing.
- `lifetimeConfig` exists for the options-bag form (`.register(k, asClass(X), { lifetime:
  lifetimeConfig.SINGLETON })`); prefer fluent `.singleton()/.scoped()/.transient()` when possible
  per Awilix 12 conventions.
- `Container` alias is `AwilixContainer<any>` — registrars should accept this, not a
  project-specific cradle type, to keep the contract uniform.
- Next wiring targets: `apps/web/src/lib/composition.ts`, `apps/mobile`, `apps/desktop` each need
  their own composition roots calling the relevant `register*DI` helpers.
- Implement request-scope middleware in `apps/api` to populate `REQUEST_ANALYTICS` per request
  (scope is defined; no Hono middleware wires it yet).
