import type { ConfigRepository, Environment } from '@t/config'
import { type Container, asFunction, dependencyKeys } from '@t/dependency-injection'
import type { CacheClient } from '../entities/ports/CacheClient.ts'
import { InMemoryCacheImpl } from '../infrastructure/InMemoryCacheImpl.ts'
import { RedisCacheImpl } from '../infrastructure/RedisCacheImpl.ts'

/**
 * DI key for the global `CacheClient` binding.
 *
 * Re-exported alias of `dependencyKeys.global.CACHE` (owned by
 * `@t/dependency-injection`). Preferred consumer form is to import the
 * canonical token directly; this alias is preserved for existing call
 * sites and tests.
 */
export const CACHE_DEPENDENCY_KEY = dependencyKeys.global.CACHE

/**
 * Options bag for {@link registerCacheDI}.
 *
 * The options-bag form matches `registerAnalyticsDI` and
 * `registerLoggerFactoryDI`: it keeps the registrar explicit at the
 * composition root and prevents hidden `process.env` reads from leaking
 * into `@t/cache` itself.
 */
export interface RegisterCacheDIOptions {
  /** Typed config repository sourced from `@t/config`. */
  readonly config: ConfigRepository
  /** Resolved runtime environment (typically from `RAILWAY_ENVIRONMENT`). */
  readonly environment: Environment
}

/**
 * Registers the cache binding in the DI container.
 *
 * Selection order (first match wins):
 *  1. `environment === 'testing'` â†’ {@link InMemoryCacheImpl}.
 *  2. otherwise â†’ {@link RedisCacheImpl} constructed with
 *     `config.redis`.
 *
 * Lifetime: `singleton`. The cache owns long-lived connections; a
 * scoped/transient lifetime would thrash connect/quit per request.
 */
export function registerCacheDI(container: Container, opts: RegisterCacheDIOptions): void {
  const { config, environment } = opts

  const factory = (): CacheClient => {
    if (environment === 'testing') {
      return new InMemoryCacheImpl()
    }
    if (!config.redis) {
      throw new Error(
        `registerCacheDI: config.redis is required when environment is '${environment}'`,
      )
    }
    return new RedisCacheImpl(config.redis)
  }

  container.register({
    [CACHE_DEPENDENCY_KEY]: asFunction(factory).singleton(),
  })
}
