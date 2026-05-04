---
name: cache bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/cache/** or apps/*/cache wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/cache — bootstrap status

**Package status:** ✅ done

## Intended

- Port: `CacheClient` (abstract) — `get / set / del / incr / withLock / publish / subscribe / close`
- Impls: `RedisCacheImpl` (ioredis, prod) + `InMemoryCacheImpl` (tests / local fallback)
- Key schema: `<env>:<module>:<id>` via Zod `CacheKeySchema` + `buildCacheKey`
- DI registrar binding port → impl under `CACHE_DEPENDENCY_KEY` (singleton)
- Config dependency: `RedisConfig` from `@t/config`
- Rate-limit middleware + distributed-lock helper in `apps/api` (downstream consumers)
- Railway self-hosted Redis service (`bitnami/redis`, AUTH + appendonly)
- CI integration tests against ephemeral Redis service container

## Actual

- `src/entities/ports/CacheClient.ts` — abstract class, 8-method surface, JSDoc contract
- `src/entities/ports/index.ts` — barrel
- `src/entities/schemas/CacheKeySchema.ts` — Zod schema + `buildCacheKey({ env, module, id })`
- `src/entities/schemas/index.ts` — barrel
- `src/entities/index.ts` — barrel
- `src/infrastructure/RedisCacheImpl.ts` — ioredis client; atomic `INCR+EXPIRE` Lua; `SET NX PX` +
  CAS-release Lua `withLock` (50ms poll, `CacheLockTimeoutError` on timeout); lazy duplicated
  subscriber connection; `close()` quits both
- `src/infrastructure/InMemoryCacheImpl.ts` — Map + setTimeout TTL (lazy + proactive); per-key
  promise-chain `withLock`; in-process pub/sub; exports `CacheLockTimeoutError`; `assertOpen()`
  guard
- `src/infrastructure/index.ts` — barrel
- `src/dependency-injection/registerCacheDI.ts` — options-bag `{ config, environment }`;
  `environment === 'testing'` → in-memory; else → Redis using `config.redis`; throws if
  `config.redis` missing in non-test env; registers `singleton` under `CACHE_DEPENDENCY_KEY` which
  now aliases canonical `dependencyKeys.global.CACHE` from `@t/dependency-injection`
- `src/index.ts` — re-exports port, schemas, `RedisCacheImpl`, `InMemoryCacheImpl`,
  `CacheLockTimeoutError`, `registerCacheDI`, `CACHE_DEPENDENCY_KEY`, `RegisterCacheDIOptions`,
  `RedisConfig` type
- `package.json` — deps `@t/config`, `@t/dependency-injection`, `ioredis ^5.4`, `zod ^3.23`; peerDep
  `awilix ^12`; scripts `test` (vitest), `typecheck`, `check`, `format`
- `src/helpers/rateLimit.ts` — fixed-window rate-limit function; `RateLimitOptions` +
  `RateLimitResult` types; uses `cache.incr(key, windowSeconds)`
- `src/helpers/withCacheLock.ts` — named wrapper over `cache.withLock`; stable documented surface
- `src/helpers/index.ts` — barrel
- `tests/` — `CacheKeySchema.test.ts`, `InMemoryCacheImpl.test.ts`, `RedisCacheImpl.test.ts` (unit,
  mocked ioredis), `registerCacheDI.test.ts` (mocks ioredis), `rateLimit.test.ts`,
  `withCacheLock.test.ts`
- `tests/integration/setup.ts` — connection check; throws clear error with docker-compose
  instructions if `REDIS_URL` unset
- `tests/integration/RedisCacheImpl.live.test.ts` — live tests against real Redis: get/set/del
  round-trip, atomic incr+TTL, withLock mutual exclusion, pub/sub fanout across separate clients,
  close() cleanup; uses `describe.skipIf(!available)`
- `vitest.config.ts` — unit suite; excludes `tests/integration/**`; 100% coverage thresholds
- `vitest.integration.config.ts` — integration suite; includes
  `tests/integration/**/*.live.test.ts`; no coverage thresholds
- `package.json` — added `test:integration` script
- `docker-compose.cache.yml` (repo root) — `bitnami/redis:7.4`, port 6380, AUTH + appendonly,
  healthcheck
- `README.md` — port surface, helpers section (rateLimit + withCacheLock examples), env var mapping,
  DI usage, integration-tests section, caveats
- `tsconfig.json`

## Consumer hooks

- Registrar: `registerCacheDI(container, { config, environment })` where `environment: 'development' | 'testing' | 'production'`
- DI key: `CACHE_DEPENDENCY_KEY` (alias for canonical `dependencyKeys.global.CACHE = 'cache'`)
- Resolve: `container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)`
- Redis factory input: `RedisConfig` (re-exported from `@t/config`: `url` | `{ host, port,
  password?, tls?, db? }`; `REDIS_URL` preferred)
- In-memory factory: zero-arg `new InMemoryCacheImpl()` (testing branch)
- Key builder: `buildCacheKey({ env, module, id }) → CacheKey` (throws on invalid segment; `:` and
  whitespace reserved)
- Error surface: `CacheLockTimeoutError` from both impls on `withLock` acquisition failure

## Gaps

- ✅ DONE 2026-04-26: `apps/api` composition root wires `registerCacheDI(container, { config,
  environment })` at the correct position (after logger, before DB). `CACHE_DEPENDENCY_KEY` resolves
  to `InMemoryCacheImpl` in testing env; `RedisCacheImpl` in production env.
  `apps/api/src/composition.test.ts` asserts `instanceof InMemoryCacheImpl` (testing) and
  `instanceof RedisCacheImpl` (production, ioredis mocked).
- ✅ DONE 2026-04-26: Rate-limit helper `rateLimit` in `src/helpers/rateLimit.ts` — fixed-window
  counter via `incr(key, ttl)`; 100% coverage in `tests/rateLimit.test.ts`.
- ✅ DONE 2026-04-26: Distributed-lock helper `withCacheLock` in `src/helpers/withCacheLock.ts` —
  thin named wrapper over `withLock`; 100% coverage in `tests/withCacheLock.test.ts`.
- ✅ DONE 2026-04-26: `railway.toml` Redis service declared — `[redis]` block with
  `bitnami/redis:7.4`, AOF persistence, volume mount, `[api.env]` `REDIS_URL` via Railway
  inter-service template. Manual provisioning steps remain (see section below).
- GitHub Actions CI service container for Redis integration tests not wired (deferred; local dev
  uses `docker-compose.cache.yml`)
- ✅ DONE 2026-04-26: Integration test infra added — `vitest.integration.config.ts`,
  `tests/integration/setup.ts`, `tests/integration/RedisCacheImpl.live.test.ts`,
  `docker-compose.cache.yml`; `test:integration` script in `package.json`; README integration-tests
  section added.
- ✅ DONE 2026-04-24: `CACHE_DEPENDENCY_KEY` hoisted to `dependencyKeys.global.CACHE` in
  `@t/dependency-injection`; local export now aliases the canonical token.

## Manual provisioning (Railway — not code work)

These steps are required once per environment to actually launch Redis in production. They are NOT
tracked as code gaps — the railway.toml declaration is complete.

1. `railway add --service redis` — provisions the bitnami/redis:7.4 service in the Railway project.
2. Set `REDIS_PASSWORD` as a sealed (secret) variable on the redis service in the Railway dashboard.
3. Attach a Railway volume to the redis service at the configured mount path so AOF data survives
   restarts.

## Changelog

- **2026-04-26 — @t/cache raised to ✅ done.** Full audit pass: composition root wired in apps/api
  (`registerCacheDI` in correct order; 135 tests, 100% coverage in
  `apps/api/src/composition.test.ts`); `rateLimit` + `withCacheLock` helpers shipped with 100%
  coverage; integration test infra landed (`vitest.integration.config.ts`,
  `tests/integration/setup.ts`, `tests/integration/RedisCacheImpl.live.test.ts`,
  `docker-compose.cache.yml`, `test:integration` script); `railway.toml` `[redis]` service block
  declared (bitnami/redis:7.4, AOF, volume, `REDIS_URL` in `[api.env]`). Only remaining open item:
  GitHub Actions CI service container for Redis integration tests (deferred). Manual Railway
  provisioning steps documented above.

## Notes for next agent

- Port is stable; do NOT add methods without updating both impls + tests simultaneously
- Serialization contract is JSON in/out at the impl boundary — callers pass plain data
- `InMemoryCacheImpl` pub/sub is intra-process only; any test asserting cross-container fanout MUST
  use `RedisCacheImpl`
- `withLock` is a single-node Redlock approximation — document the caveat on every helper that wraps
  it; not safe for correctness-critical leases
- Redis subscriber connection is lazy — first `subscribe()` call triggers `client.duplicate()`;
  `close()` tears both down
- `incr` TTL is atomic via Lua in Redis impl; in-memory matches semantics via serialized writes
- `apps/api` wiring complete (2026-04-26): `buildContainer()` reads `config.system?.environment`
  (sourced from `RAILWAY_ENVIRONMENT` / `ENVIRONMENT` env var via `@t/config`) and passes it to
  `registerCacheDI`. The registrar never sniffs `process.env` directly.
- Any change to `packages/cache/**` or `apps/*/cache wiring` → update this file's `last_audited` +
  relevant sections, and `docs/prd-status/matrix.md` when it lands
