---
name: Dependency Injection
description: Token registry, Awilix re-exports, Container type alias, and composition-root conventions for @t/dependency-injection
last_audited: 2026-04-26
---

# @t/dependency-injection

Central DI foundation for the monorepo. Provides the token registry, canonical Awilix re-exports,
`lifetimeConfig` constants, and the `Container` type alias. It does NOT provide registrars — each
consumer package owns its own `register*DI.ts` file. It does NOT provide a pre-built composition
root — each app owns its own `buildContainer()`.

---

## Overview

`@t/dependency-injection` gives every package in the monorepo three things:

1. **Token registry** (`dependencyKeys`) — the single source of truth for every DI key string.
   Importing the token here prevents typos and makes rename refactors mechanical.
2. **Awilix primitives** — `createContainer`, `asClass`, `asFunction`, `asValue`, `InjectionMode`,
   `Lifetime` re-exported so consumers never import Awilix directly.
3. **`lifetimeConfig` constants** — `SINGLETON`, `SCOPED`, `TRANSIENT` in options-bag form for call
   sites that prefer `{ lifetime: lifetimeConfig.SINGLETON }` over the fluent `.singleton()`
   builder.
4. **`Container` type alias** — `AwilixContainer` (unparametrized) used across every
   `register*DI(container: Container)` signature.

What this package does NOT do:

- Register any services. Registrars live in each consumer package under
  `src/dependency-injection/register*DI.ts`.
- Provide a ready-made composition root. Each app owns `src/composition.ts#buildContainer()`.
- Hard-code any concrete implementations. The package is pure infrastructure plumbing — no business
  logic.

---

## Module layout

```text
packages/dependency-injection/
  src/
    entities/
      dependencyKeys.ts        token registry (global + request groups)
    infrastructure/
      container.ts             Awilix re-exports + lifetimeConfig + Container alias
    index.ts                   barrel — re-exports both of the above
  tests/
    dependencyKeys.test.ts     shape snapshot + uniqueness + collision guards
    container.test.ts          Awilix primitive smoke tests
  package.json
  tsconfig.json
  vitest.config.ts
```

---

## Call graph

```text
app composition root (apps/api/src/composition.ts#buildContainer())
  |
  |-- createContainer()                       from @t/dependency-injection
  |
  |-- registerConfigRepo(container)           from @t/config
  |-- registerLoggerFactoryDI(container)      from @t/logging
  |-- registerLoggerDI(container, opts)       from @t/logging
  |-- registerCacheDI(container, opts)        from @t/cache
  |-- registerDbDI(container, opts)           from @t/db
  |-- registerAuthDI(container, opts)         from @t/auth
  |-- registerAnalyticsDI(container, opts)    from @t/analytics
  |-- registerBillingDI(container, opts)      from @t/billing (guarded by try/catch)
  |
  v
Awilix container
  |
  |-- container.resolve(dependencyKeys.global.X)     consumer call sites
  |-- container.resolve(dependencyKeys.request.X)    per-request scope
```

Each `register*DI` function receives the container and an explicit options bag. It reads
`dependencyKeys` from `@t/dependency-injection` to bind its token. The token string is never
hard-coded in the registrar.

---

## Token registry

All tokens defined in `packages/dependency-injection/src/entities/dependencyKeys.ts`.

### Global tokens (singleton lifetime)

| Token | String key | Lifetime | Owning package | Type provided | Registrar function |
| --- | --- | --- | --- | --- | --- |
| `dependencyKeys.global.CONFIG` | `'config'` | singleton | `@t/config` | `ConfigRepository` | `registerConfigRepo()` |
| `dependencyKeys.global.LOGGER_FACTORY` | `'loggerFactory'` | singleton | `@t/logging` | `LoggerFactory` (function) | `registerLoggerFactoryDI()` |
| `dependencyKeys.global.LOGGER` | `'logger'` | singleton | `@t/logging` | `Logger` (GlobalLogger) | `registerLoggerDI()` |
| `dependencyKeys.global.CACHE` | `'cache'` | singleton | `@t/cache` | `CacheClient` | `registerCacheDI()` |
| `dependencyKeys.global.DB` | `'db'` | singleton | `@t/db` | Drizzle DB client | `registerDbDI()` |
| `dependencyKeys.global.USER_REPOSITORY` | `'userRepository'` | singleton | `@t/db` | `UserRepository` | `registerDbDI()` |
| `dependencyKeys.global.EMBEDDING_STORE` | `'embeddingStore'` | singleton | `@t/db` | `EmbeddingStore` | `registerDbDI()` |
| `dependencyKeys.global.AUTH` | `'auth'` | singleton | `@t/auth` | `AuthRepository` | `registerAuthDI()` |
| `dependencyKeys.global.ANALYTICS` | `'analytics'` | singleton | `@t/analytics` | `AnalyticsTracker` | `registerAnalyticsDI()` |
| `dependencyKeys.global.BILLING_REPOSITORY` | `'billingRepository'` | singleton | `@t/billing` | `BillingRepository` | `registerBillingDI()` |

### Request-scoped tokens

| Token | String key | Lifetime | Owning package | Type provided | Registrar function |
| --- | --- | --- | --- | --- | --- |
| `dependencyKeys.request.REQUEST_ANALYTICS` | `'requestAnalytics'` | scoped | `@t/analytics` | `RequestAnalyticsTracker` | `registerAnalyticsDI()` |

`REQUEST_ANALYTICS` is stamped with `distinctId`, `sessionId`, and `requestId` per inbound HTTP
request. The registrar creates it in a child scope from the global container. The request-scope
middleware wiring (creating a child container per request and registering `REQUEST_ANALYTICS` on it)
is currently a TODO in `registerAnalyticsDI`.

---

## Registrar contract

Every `register*DI` function in the monorepo follows the same options-bag convention:

```ts
// canonical registrar signature
export function registerFooDI(
  container: Container,
  opts: { config: ConfigRepository; environment: Environment },
): void {
  const impl =
    opts.environment === 'testing'
      ? asValue(new InMemoryFooImpl())
      : asClass(FooImpl).singleton()

  container.register({ [dependencyKeys.global.FOO]: impl })
}
```

**Why options bags and not `container.resolve` inside the registrar?**

- No hidden `process.env` reads inside platform packages. The composition root resolves `CONFIG`
  once, then passes the resolved config object down to every registrar. Each registrar is a pure
  function of its options.
- Explicit call-site control. The composition root sees every dependency in one place; dependency
  order is obvious by reading `buildContainer()` top-to-bottom.
- Testability. Registrars can be unit-tested by passing a stub `ConfigRepository` without standing
  up a real container.

The only exception is `registerConfigRepo` from `@t/config`, which reads `process.env` directly at
construction — it has no upstream config to receive, so it must bootstrap itself.

---

## Registrar reference table

| Registrar | File | Tokens registered | Options-bag shape | Container deps pulled | Default lifetime | Testing fallback |
| --- | --- | --- | --- | --- | --- | --- |
| `registerConfigRepo` | `packages/config/dependency-injection/registerConfigRepoDI.ts` | `CONFIG` | `options?: { schema? }` | none | singleton (asValue) | no fallback — always reads process.env; env vars stubbed in test setup |
| `registerLoggerFactoryDI` | `packages/logging/dependency-injection/registerLoggerFactoryDI.ts` | `LOGGER_FACTORY` | none | none | singleton | no fallback — factory itself is always registered |
| `registerLoggerDI` | `packages/logging/dependency-injection/registerLoggerDI.ts` | `LOGGER` | `{ context, redactExtraPaths? }` | none | singleton | no fallback — GlobalLogger is always registered |
| `registerCacheDI` | `packages/cache/dependency-injection/registerCacheDI.ts` | `CACHE` | `{ config, environment }` | none | singleton | `InMemoryCacheImpl` |
| `registerDbDI` | `packages/db/dependency-injection/registerDbDI.ts` | `DB`, `USER_REPOSITORY`, `EMBEDDING_STORE` | `{ config, environment }` | none | singleton | `DB` not registered; `InMemoryUserRepository` + `InMemoryEmbeddingStore` used |
| `registerAuthDI` | `packages/auth/dependency-injection/registerAuthDI.ts` | `AUTH` | `{ config, environment }` | none | singleton | `NoopAuthProvider` |
| `registerAnalyticsDI` | `packages/analytics/dependency-injection/registerAnalyticsDI.ts` | `ANALYTICS` | `{ config, environment, service }` | none | singleton | `NoOpAnalyticsTracker` |
| `registerBillingDI` | `packages/billing/dependency-injection/registerBillingDI.ts` | `BILLING_REPOSITORY` | `{ stripeConfig, revenuecatConfig, revenuecatWebhookAuthHeader }` | none | singleton (asFunction) | no built-in fallback; composition root wraps in try/catch |

Notes:

- `registerDbDI` is the only registrar that registers multiple tokens in a single call (DB +
  USER_REPOSITORY + EMBEDDING_STORE). Under `environment === 'testing'` it skips the DB binding
  entirely and registers in-memory repository implementations instead.
- `registerBillingDI` uses `asFunction` rather than `asClass`, so config errors surface at resolve
  time, not registration time. The composition root wraps the call in a `try/catch` to prevent a
  missing billing credential from crashing the server.

---

## Composition root convention

Each app owns one `buildContainer()` function in `src/composition.ts`. There is no shared factory —
apps have different registrar sets and different env-var requirements.

The canonical example is `apps/api/src/composition.ts`.

### Per-app composition roots

| App | File | Registrars wired |
| --- | --- | --- |
| `apps/api` | `apps/api/src/composition.ts` | Config, LoggerFactory, Logger, Cache, Db, Auth, Analytics, Billing |
| `apps/desktop` | `apps/desktop/src/main/composition.ts` | Config (`DesktopConfigValuesSchema`), LoggerFactory, Logger — lazy module-level singleton; main process only |

### Wiring order

The order matters because each registrar may depend on the output of an earlier one:

```text
1. registerConfigRepo(container)
     — must be first; every other registrar receives config as an option

2. registerLoggerFactoryDI(container)
     — no upstream deps; factory is stateless

3. registerLoggerDI(container, { context })
     — needs LOGGER_FACTORY to be resolvable (depends on step 2)

4. registerCacheDI(container, { config, environment })
     — needs resolved config (step 1)

5. registerDbDI(container, { config, environment })
     — needs resolved config (step 1)

6. registerAuthDI(container, { config, environment })
     — needs resolved config (step 1)

7. registerAnalyticsDI(container, { config, environment, service })
     — needs resolved config (step 1)

8. registerBillingDI(container, { stripeConfig, revenuecatConfig, ... })
     — needs resolved config (step 1); wrapped in try/catch
```

After wiring, the container is returned. Consumers (Hono route handlers, tRPC procedures,
middleware) call `container.resolve(dependencyKeys.global.X)` at request time — never at startup,
except in tests.

---

## Lifetime guidance

| Lifetime | When to use | Awilix fluent | Options-bag form |
| --- | --- | --- | --- |
| `SINGLETON` | Long-lived connections, expensive construction, shared mutable state is safe. DB clients, cache clients, loggers, config repos. | `.singleton()` | `{ lifetime: lifetimeConfig.SINGLETON }` |
| `SCOPED` | Per-request state — distinct_id, session_id, request_id. Created fresh for each child container scope. | `.scoped()` | `{ lifetime: lifetimeConfig.SCOPED }` |
| `TRANSIENT` | Cheap, stateless value objects where sharing is undesirable. Rarely used in this codebase. | `.transient()` | `{ lifetime: lifetimeConfig.TRANSIENT }` |

All current global tokens are singleton: DB connections and cache clients are expensive to construct
and must be shared. `REQUEST_ANALYTICS` is scoped because it carries per-request identity fields.

`lifetimeConfig` is provided for call sites that prefer the options-bag form over the fluent builder
— both are correct; prefer whichever reads more clearly at the register call site.

---

## Testing strategy

### Composition root smoke test

`apps/api/src/composition.test.ts` boots `buildContainer()` under `NODE_ENV=testing` (env stubs set
in `apps/api/src/__tests__/setup.ts`) and asserts that every expected token resolves without
throwing. It also asserts that `DB` throws (intentionally not registered in testing).

This test catches: wrong wiring order, missing env var stubs, broken registrar logic, token key
typos.

### In-package token shape tests

`packages/dependency-injection/tests/dependencyKeys.test.ts` asserts:

- Every global token has its exact expected string value.
- `global` contains exactly 10 keys.
- `request` contains exactly 1 key.
- All global values are unique strings.
- No value collision between `global` and `request` namespaces.
- Runtime shape guard (all values are strings — `as const` is a TypeScript compile-time guarantee
  only; no runtime `Object.freeze` is called).

`packages/dependency-injection/tests/container.test.ts` asserts:

- `createContainer()` returns an object with `register` and `resolve`.
- `asValue`, `asClass`, `asFunction` work as expected.
- `lifetimeConfig` constants match `Lifetime` enum values.
- `InjectionMode.PROXY` is defined.

### How registrars handle `environment === 'testing'`

Every registrar inspects the `environment` field of the options bag passed from the composition
root:

- `CACHE` → `InMemoryCacheImpl`
- `DB` → not registered; `InMemoryUserRepository` + `InMemoryEmbeddingStore` registered instead
- `AUTH` → `NoopAuthProvider`
- `ANALYTICS` → `NoOpAnalyticsTracker`
- `BILLING_REPOSITORY` → no built-in fallback; the composition root `try/catch` catches the
  missing-credential error silently

### Why DB is intentionally not registered in testing

Drizzle requires a live Postgres connection. Tests that need data use the in-memory repository
implementations registered in its place. Procedures must resolve `USER_REPOSITORY` /
`EMBEDDING_STORE`, not `DB`. If a test accidentally tries to resolve `DB`, the container throws —
this is the desired behavior, not a bug.

---

## Adding a new token

Follow this sequence exactly. Each step has a verifiable checkpoint.

1. **Add the token** to `dependencyKeys.global` or `dependencyKeys.request` in
   `packages/dependency-injection/src/entities/dependencyKeys.ts`.

2. **Run the token shape test** — it will fail on the "contains exactly N keys" assertion. This is
   the expected checkpoint: the test is locking the shape, so a shape change must be acknowledged by
   updating the assertion.

   ```sh
   bunx vitest run --root packages/dependency-injection tests/dependencyKeys.test.ts
   ```

   Update the `toHaveLength` assertion and re-run to green before proceeding.

3. **Implement the registrar** in the consuming package under
   `src/dependency-injection/register{Name}DI.ts`. Follow the options-bag pattern. Include an
   `environment === 'testing'` branch that registers a no-op or in-memory fallback.

4. **Wire the registrar** in every app's `src/composition.ts` at the correct position in the
   dependency order. Pass the resolved `config` object — do not call `process.env` inside the
   registrar.

5. **Update the app's smoke test** — add an `it('resolves NEW_TOKEN', ...)` case to
   `apps/{app}/src/composition.test.ts`.

6. **Update docs** in the same commit:
   - This file (`docs/architecture/platform/dependency-injection.md`) — add the token to the
     registry table and the registrar to the reference table.
   - `docs/prd-status/packages/dependency-injection.md` — update changelog.
   - `docs/prd-status/matrix.md` — update the DI row if the package status changes.

---

## Adding a new app

When wiring a new app (e.g., `apps/website` or a future `apps/admin`):

1. Create `apps/{app}/src/composition.ts` exporting `buildContainer(): Container`.
2. Import `createContainer` and `dependencyKeys` from `@t/dependency-injection`.
3. Wire only the registrars the app actually needs — not all apps need billing or DB.
4. Resolve `CONFIG` first; pass it to all downstream registrars.
5. Wrap `registerBillingDI` in `try/catch` if included.
6. Create `apps/{app}/src/__tests__/setup.ts` with env var stubs for `NODE_ENV=testing`.
7. Create `apps/{app}/src/composition.test.ts` asserting each wired token resolves.
8. Update `docs/prd-status/matrix.md` — add the new app column.

---

## Soft-fail policy

Registrars never hard-crash on missing env vars. The fallback per registrar:

| Registrar | Soft-fail behavior |
| --- | --- |
| `registerCacheDI` | `InMemoryCacheImpl` when `environment === 'testing'` or Redis vars absent |
| `registerDbDI` | `InMemoryUserRepository` + `InMemoryEmbeddingStore`; DB token not registered |
| `registerAuthDI` | `NoopAuthProvider` when `environment === 'testing'` |
| `registerAnalyticsDI` | `NoOpAnalyticsTracker` when `environment === 'testing'` or PostHog key absent |
| `registerBillingDI` | No built-in fallback; composition root wraps in `try/catch` and logs a warning via resolved LOGGER |

This policy means `buildContainer()` always succeeds regardless of which env vars are present or
absent, which is essential for CI (where billing and DB credentials are not available) and local
development.

---

## Open items / future work

- **Package rename consideration.** Disk name is `@t/dependency-injection`; some docs use `@t/*`
  short form. Decide once and update all references consistently.
- **Request-scope middleware.** `registerAnalyticsDI` has a TODO to wire `REQUEST_ANALYTICS` into a
  per-request child container via Hono middleware. Until that middleware lands, `REQUEST_ANALYTICS`
  is defined but unreachable at runtime.
- **Async resolver story.** Awilix 12 supports async `dispose()` via `container.dispose()`. If DB or
  cache require graceful shutdown, add a `disposeContainer(container)` helper in the composition
  root and wire it to process signal handlers (`SIGTERM`, `SIGINT`).
- **`InjectionMode` selection.** The monorepo uses the default `PROXY` mode. If a consumer package
  needs `CLASSIC` (explicit constructor parameter naming), document the trade-offs and add a
  per-container override.

---

## References

- `packages/dependency-injection/src/entities/dependencyKeys.ts` — token registry source
- `packages/dependency-injection/src/infrastructure/container.ts` — Awilix re-exports +
  lifetimeConfig
- `apps/api/src/composition.ts` — canonical composition root
- `apps/api/src/composition.test.ts` — composition root smoke test
- `packages/dependency-injection/tests/dependencyKeys.test.ts` — token shape tests
- `docs/prd-status/packages/dependency-injection.md` — bootstrap status
- `docs/architecture/platform/config.md` — sibling platform doc (Config)
- `docs/architecture/platform/logging.md` — sibling platform doc (Logging)
- [Awilix GitHub](https://github.com/jeffijoe/awilix) — upstream container library
