import { type Container, createContainer } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stub ioredis so RedisCacheImpl construction doesn't open a real socket.
vi.mock('ioredis', () => {
  class FakeRedis {
    // biome-ignore lint/complexity/noUselessConstructor: accepts ioredis constructor args
    constructor(_: unknown, __?: unknown) {}
    duplicate() {
      return new FakeRedis({})
    }
    on() {
      return this
    }
    async quit() {
      return 'OK'
    }
    disconnect() {
      /* noop */
    }
  }
  return { default: FakeRedis }
})

import {
  CACHE_DEPENDENCY_KEY,
  registerCacheDI,
} from '../src/dependency-injection/registerCacheDI.ts'
import { CacheClient } from '../src/entities/ports/CacheClient.ts'
import { InMemoryCacheImpl } from '../src/infrastructure/InMemoryCacheImpl.ts'
import { RedisCacheImpl } from '../src/infrastructure/RedisCacheImpl.ts'

function makeConfig(redis?: unknown): { redis?: unknown } {
  return { redis }
}

describe('registerCacheDI', () => {
  let container: Container
  beforeEach(() => {
    container = createContainer()
  })
  afterEach(async () => {
    await container.dispose()
  })

  it('registers InMemoryCacheImpl under CACHE_DEPENDENCY_KEY in testing env', () => {
    registerCacheDI(container, {
      config: makeConfig() as never,
      environment: 'testing',
    })
    const resolved = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(InMemoryCacheImpl)
    expect(resolved).toBeInstanceOf(CacheClient)
  })

  it('registers RedisCacheImpl in development env when config.redis is set', () => {
    registerCacheDI(container, {
      config: makeConfig({ url: 'redis://localhost:6379' }) as never,
      environment: 'development',
    })
    const resolved = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(RedisCacheImpl)
  })

  it('registers RedisCacheImpl in production env when config.redis is set', () => {
    registerCacheDI(container, {
      config: makeConfig({
        host: 'localhost',
        port: 6379,
      }) as never,
      environment: 'production',
    })
    const resolved = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(RedisCacheImpl)
  })

  it('throws when production/development env is missing config.redis', () => {
    registerCacheDI(container, {
      config: makeConfig() as never,
      environment: 'production',
    })
    expect(() => container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)).toThrow(
      /config\.redis is required/,
    )
  })

  it('resolves the same singleton instance on repeated resolve calls', () => {
    registerCacheDI(container, {
      config: makeConfig() as never,
      environment: 'testing',
    })
    const a = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    const b = container.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(a).toBe(b)
  })
})
