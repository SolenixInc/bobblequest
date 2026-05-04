# @t/queue

Background job queue port + BullMQ / in-memory implementations for the template monorepo.

## Overview

A single abstract-class port, `QueueClient`, with two bundled adapters:

- `BullMQQueueClientImpl` — production backend over `bullmq` (Redis-backed).
- `InMemoryQueueImpl` — test double / local dev fallback. No-op; jobs are discarded immediately.

## Port surface

```ts
abstract class QueueClient {
  enqueue<T>(jobName, payload, opts?): Promise<void>
  // opts: { delayMs?: number; retries?: number; priority?: number }

  registerHandler<T>(jobName, handler: (payload: T) => Promise<void>): void

  close(): Promise<void>
}
```

## Implementations

### InMemoryQueueImpl

Stub used in `testing` environments and local dev. `enqueue()` is a no-op;
`registerHandler()` is a no-op; `close()` marks the instance closed. Throws
`Error('InMemoryQueueImpl: used after close()')` on `enqueue()` after close.

### BullMQQueueClientImpl

Redis-backed implementation using [BullMQ](https://docs.bullmq.io/). A single
worker is created in the constructor and dispatches jobs to registered handlers
by `jobName`. Constructor signature:

```ts
new BullMQQueueClientImpl(config: RedisConfig, logger: Logger, queueName?: string)
```

- `config` — from `@t/config` (`RedisConfig`).
- `logger` — from `@t/logging` (`Logger`).
- `queueName` — defaults to `'default'`.

## DI registration

```ts
import { registerQueueDI, QUEUE_DEPENDENCY_KEY } from '@t/queue'

registerQueueDI(container, {
  config,
  environment: 'production', // 'development' | 'testing' | 'production' | ...
})

const queue = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
```

Selection:
- `environment === 'testing'` -> `InMemoryQueueImpl`
- otherwise -> `BullMQQueueClientImpl` (reads `config.redis`)

Throws `Error('registerQueueDI: config.redis is required ...')` when
`config.redis` is absent in a non-testing environment.

Lifetime is `singleton` — the queue owns long-lived Redis connections.

## Config

Wired into `@t/config` -> `config.redis`:

```text
REDIS_URL        full connection URL (preferred if set)
REDIS_HOST       host (default: 127.0.0.1)
REDIS_PORT       port (default: 6379)
REDIS_PASSWORD   optional
REDIS_TLS        truthy -> enable TLS
REDIS_DB         optional db index
```

## Testing

```bash
bun run test          # unit tests (no Redis required)
bun run test:coverage # with coverage report
```

Runs all tests under `tests/` (excluding `tests/integration/`). Requires
100% coverage.

- `InMemoryQueueImpl` tests cover the full port surface (open/close, enqueue, handlers).
- `BullMQQueueClientImpl` unit tests mock `bullmq` — no real Redis required.
- DI registrar tests mock both `bullmq` and `@t/logging` so construction
  does not open sockets or initialise transports.
