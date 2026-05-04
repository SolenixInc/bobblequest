import type { ConfigRepository, Environment } from '@t/config'
import { type Container, asFunction, dependencyKeys } from '@t/dependency-injection'
import { createGlobalLogger } from '@t/logging'
import type { QueueClient } from '../entities/ports/QueueClient.ts'
import { BullMQQueueClientImpl } from '../infrastructure/BullMQQueueClientImpl.ts'
import { InMemoryQueueImpl } from '../infrastructure/InMemoryQueueImpl.ts'

/**
 * DI key for the global `QueueClient` binding.
 *
 * Re-exported alias of `dependencyKeys.global.QUEUE` (owned by
 * `@t/dependency-injection`). Preferred consumer form is to import the
 * canonical token directly; this alias is preserved for existing call
 * sites and tests.
 */
export const QUEUE_DEPENDENCY_KEY = dependencyKeys.global.QUEUE

/**
 * Options bag for {@link registerQueueDI}.
 *
 * The options-bag form matches `registerCacheDI` and `registerAnalyticsDI`:
 * it keeps the registrar explicit at the composition root and prevents
 * hidden `process.env` reads from leaking into `@t/queue` itself.
 */
export interface RegisterQueueDIOptions {
  /** Typed config repository sourced from `@t/config`. */
  readonly config: ConfigRepository
  /** Resolved runtime environment (typically from `RAILWAY_ENVIRONMENT`). */
  readonly environment: Environment
}

/**
 * Registers the queue binding in the DI container.
 *
 * Selection order (first match wins):
 *  1. `environment === 'testing'` → {@link InMemoryQueueImpl}.
 *  2. otherwise → {@link BullMQQueueClientImpl} constructed with
 *     `config.redis`.
 *
 * Throws if `config.redis` is missing in a non-testing environment.
 *
 * Lifetime: `singleton`. The queue owns long-lived Redis connections;
 * a scoped/transient lifetime would thrash connect/close per request.
 */
export function registerQueueDI(container: Container, opts: RegisterQueueDIOptions): void {
  const { config, environment } = opts

  const factory = (): QueueClient => {
    if (environment === 'testing') {
      return new InMemoryQueueImpl()
    }
    if (!config.redis) {
      throw new Error(
        `registerQueueDI: config.redis is required when environment is '${environment}'`,
      )
    }
    const logger = createGlobalLogger({})
    return new BullMQQueueClientImpl(config.redis, logger)
  }

  container.register({
    [QUEUE_DEPENDENCY_KEY]: asFunction(factory).singleton(),
  })
}
