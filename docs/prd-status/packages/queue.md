---
name: queue bootstrap status
last_audited: 2026-04-28
maintainer_contract: any agent editing packages/queue/** or apps/*/queue wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/queue — bootstrap status

**Package status:** ✅ wired (BullMQ knobs partial)

## Intended

- Port: `QueueClient` (abstract) — `enqueue / registerHandler / close`
- Impls: `BullMQQueueClientImpl` (Redis-backed, prod) + `InMemoryQueueImpl` (testing stub / local
  fallback)
- DI registrar binding port → impl under `QUEUE_DEPENDENCY_KEY` (singleton)
- Config dependency: `RedisConfig` from `@t/config` (shared with `@t/cache`)
- Worker entrypoint and cron entrypoint in `apps/api` consuming the port (separate Bun processes /
  Railway services)
- BullMQ-specific knobs (concurrency, attempts/backoff, repeat scheduling) wired through `@t/config`

## Actual

- `src/entities/ports/QueueClient.ts` — abstract class, 3-method surface, JSDoc contract; opts bag
  accepts `{ delayMs?, retries?, priority? }` (not yet forwarded by impl)
- `src/infrastructure/BullMQQueueClientImpl.ts` — `bullmq` `Queue` + single `Worker` keyed by
  `queueName` (default `'default'`); processor dispatches to handler map by `job.name`; missing
  handlers warn + no-op; handler exceptions log + re-throw so BullMQ retries fire; `close()` closes
  queue + every worker via `Promise.all`; constructor takes `(RedisConfig, Logger, queueName?)`
- `src/infrastructure/InMemoryQueueImpl.ts` — stub: `enqueue` no-op (jobs discarded),
  `registerHandler` no-op, `close()` flips closed flag, `enqueue()` after close throws
  `Error('InMemoryQueueImpl: used after close()')`
- `src/dependency-injection/registerQueueDI.ts` — options-bag `{ config, environment }`;
  `environment === 'testing'` → `InMemoryQueueImpl`; else → `BullMQQueueClientImpl(config.redis,
  createGlobalLogger({}))`; throws if `config.redis` missing in non-test env; registers `singleton`
  under `QUEUE_DEPENDENCY_KEY` aliasing canonical `dependencyKeys.global.QUEUE`
- `src/index.ts` — re-exports `QueueClient`, `InMemoryQueueImpl`, `BullMQQueueClientImpl`,
  `registerQueueDI`, `QUEUE_DEPENDENCY_KEY`, `RegisterQueueDIOptions`
- `package.json` — deps `@t/config`, `@t/dependency-injection`, `@t/logging`, `bullmq`; scripts
  `test` (vitest), `typecheck`, `check`, `format`
- `tests/infrastructure/InMemoryQueueImpl.test.ts` — full port surface (open/close, enqueue,
  handlers, close-then-enqueue throws)
- `tests/infrastructure/BullMQQueueClientImpl.test.ts` — mocks `bullmq` end-to-end; asserts
  queue/worker construction, `enqueue → queue.add`, handler dispatch by `job.name`, missing-handler
  warning, error log + re-throw on handler exception, `close()` shuts both
- `tests/dependency-injection/registerQueueDI.test.ts` — mocks `bullmq` and `@t/logging`; asserts
  `InMemoryQueueImpl` under testing, `BullMQQueueClientImpl` under development + production, throws
  when `config.redis` absent in prod, singleton lifetime
- `vitest.config.ts` — 100% coverage thresholds (statement/branch/function/line)
- `README.md` — port surface, impls, DI usage, config env vars, testing notes

## Consumer hooks

- Registrar: `registerQueueDI(container, { config, environment })`
- DI key: `QUEUE_DEPENDENCY_KEY` (alias for canonical `dependencyKeys.global.QUEUE = 'queue'`)
- Resolve: `container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)`
- BullMQ factory input: `RedisConfig` re-used from `@t/config` (`url` | `{ host, port, password?,
  tls?, db? }`; `REDIS_URL` preferred); shared with `@t/cache` — no separate Redis instance required
- In-memory factory: zero-arg `new InMemoryQueueImpl()` (testing branch)

## Gaps

- ✅ DONE 2026-04-28 (commit `3aa4b61`): `apps/api` composition root wires
  `registerQueueDI(container, { config, environment })`. `QUEUE_DEPENDENCY_KEY` resolves to
  `InMemoryQueueImpl` under `environment === 'testing'`; `BullMQQueueClientImpl` under production.
- ✅ DONE 2026-04-28 (commit `3aa4b61`): Worker entrypoint `apps/api/src/worker.ts` (long-running Bun
  process, `bun run worker` / `bun run worker:dev`). Calls `buildContainer()`,
  `installProcessHandlers(container)`, `registerJobHandlers(container)`. Handlers live in
  `apps/api/src/jobs/handlers/` (`pingHandler`, `heartbeatHandler`).
- ✅ DONE 2026-04-28 (commit `3aa4b61`): Cron entrypoint `apps/api/src/cron.ts` (one-shot, `bun run
  cron`). Resolves `QueueClient`, enqueues `'heartbeat'`, closes queue, exits 0. Designed to be
  invoked by Railway's cron service.
- ✅ DONE 2026-04-28 (commit `3aa4b61`): Graceful shutdown — `apps/api/src/lifecycle.ts`
  SIGTERM/SIGINT handlers `await queue.close()` before `await shutdownLogging()` and
  `process.exit(0)`.
- 🟡 PARTIAL: BullMQ-specific knobs (concurrency, default `attempts` / `backoff`, repeat-job
  scheduling, dead-letter queue naming) are **not** yet wired into `@t/config`. They live as
  hard-coded defaults in `BullMQQueueClientImpl` (single worker, queue name `'default'`, no per-job
  opts forwarded). See `docs/architecture/platform/queue.md` § Open Items.
- 🟡 PARTIAL: `enqueue` opts pass-through. Port accepts `{ delayMs?, retries?, priority? }`;
  `BullMQQueueClientImpl.enqueue` ignores them — tracked alongside the schema work.
- ⏳ PENDING: Repeat-job scheduling. `cron.ts` enqueues a one-shot `'heartbeat'` as a placeholder
  because the port has no `repeat` option. Extending the port (or adding `enqueueRepeating(name,
  payload, cronExpr)`) is the path to real cron-driven recurring work.
- ⏳ PENDING: DLQ + observability. No dead-letter queue wiring, no per-job tracing, no Prometheus
  metrics. BullMQ events (`completed`, `failed`, `stalled`) need to flow into `@t/analytics` + OTLP.
- ⏳ PENDING: Integration tests. Unit suite mocks `bullmq`. Real-Redis integration coverage
  (round-trip, retry semantics, graceful shutdown under load) deferred until W7 CI hardening; will
  mirror the `@t/cache` integration pattern (`vitest.integration.config.ts` +
  `tests/integration/*.live.test.ts` + `docker-compose.queue.yml`).

## Manual provisioning (Railway — not code work)

The queue rides on the same Redis instance provisioned for `@t/cache` — no extra service is
required. To run the worker and cron as separate Railway services:

1. Deploy a second Railway service from the same repo with start command `bun run --cwd apps/api
   worker` (long-running, autorestart).
2. Deploy a third Railway service as a cron job with start command `bun run --cwd apps/api cron` and
   a Railway cron expression (e.g. `*/5 * * * *`).
3. Both services share the same env vars as the HTTP service (`REDIS_URL` and friends, plus any
   handler-specific config).

## Changelog

- **2026-04-28 — @t/queue raised to ✅ wired (BullMQ knobs partial).** Commit `3aa4b61` finalized the
  package: `QueueClient` port, `BullMQQueueClientImpl` (with mocked-bullmq tests at 100% coverage),
  `InMemoryQueueImpl` stub, and `registerQueueDI` env-switch (testing → InMemory, else → BullMQ via
  `config.redis`). Composition root in `apps/api` wires the registrar; consumer entrypoints
  `apps/api/src/worker.ts` (worker daemon) and `apps/api/src/cron.ts` (one-shot scheduler) landed in
  the same commit, alongside `apps/api/src/jobs/registerJobHandlers.ts` + `pingHandler` +
  `heartbeatHandler` and the SIGTERM/SIGINT `queue.close()` hook in `apps/api/src/lifecycle.ts`.
  Open: BullMQ knobs (concurrency, attempts, repeat scheduling) into `@t/config`, `enqueue` opts
  pass-through, real-Redis integration suite.

## Notes for next agent

- Port is small (3 methods); do NOT add methods without updating both impls + tests simultaneously
- `InMemoryQueueImpl` is a STUB, not an in-process executor — it does NOT actually run handlers.
  Tests asserting "the job ran" must mock `QueueClient` directly
- BullMQ branch resolves `Logger` via `createGlobalLogger({})` (not the container) to avoid
  registrar-ordering coupling; tests mock both `bullmq` and `@t/logging`
- Redis is shared with `@t/cache` — no separate `RedisConfig` schema for queues. If queue/cache
  traffic ever needs isolation, fork a `QueueRedisConfig` and use `REDIS_DB` to namespace
- `cron.ts` is one-shot by design — invoke it from Railway's cron service, do not run it as a daemon
- `apps/api/src/lifecycle.ts` SIGTERM/SIGINT handler awaits `queue.close()` before
  `shutdownLogging()` — preserve that ordering when adding more shutdown hooks
- Any change to `packages/queue/**` or `apps/*/queue wiring` → update this file's `last_audited` +
  relevant sections, and `docs/prd-status/matrix.md` when it lands
