import { type Container, createContainer } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// bullmq mock — prevent real Redis connections during DI resolution
// ---------------------------------------------------------------------------

vi.mock('bullmq', () => ({
  Queue: class FakeQueue {
    // biome-ignore lint/complexity/noUselessConstructor: accepts bullmq constructor args
    constructor(_name: unknown, _opts?: unknown) {}
    async close() {
      return undefined
    }
  },
  Worker: class FakeWorker {
    // biome-ignore lint/complexity/noUselessConstructor: accepts bullmq constructor args
    constructor(_name: unknown, _processor: unknown, _opts?: unknown) {}
    on() {
      return this
    }
    async close() {
      return undefined
    }
  },
}))

// ---------------------------------------------------------------------------
// @t/logging mock — avoid real Winston/OTLP setup in unit tests
// ---------------------------------------------------------------------------

vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    requestId: 'test',
    userId: undefined,
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// SUT imports — AFTER mock registration
// ---------------------------------------------------------------------------

import {
  QUEUE_DEPENDENCY_KEY,
  registerQueueDI,
} from '../../src/dependency-injection/registerQueueDI.ts'
import { QueueClient } from '../../src/entities/ports/QueueClient.ts'
import { BullMQQueueClientImpl } from '../../src/infrastructure/BullMQQueueClientImpl.ts'
import { InMemoryQueueImpl } from '../../src/infrastructure/InMemoryQueueImpl.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(redis?: unknown): { redis?: unknown } {
  return { redis }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerQueueDI', () => {
  let container: Container

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(async () => {
    await container.dispose()
  })

  it('registers InMemoryQueueImpl under QUEUE_DEPENDENCY_KEY in testing env', () => {
    registerQueueDI(container, {
      config: makeConfig() as never,
      environment: 'testing',
    })
    const resolved = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(InMemoryQueueImpl)
    expect(resolved).toBeInstanceOf(QueueClient)
  })

  it('registers BullMQQueueClientImpl in development env when config.redis is set', () => {
    registerQueueDI(container, {
      config: makeConfig({ host: 'localhost', port: 6379 }) as never,
      environment: 'development',
    })
    const resolved = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(BullMQQueueClientImpl)
  })

  it('registers BullMQQueueClientImpl in production env when config.redis is set', () => {
    registerQueueDI(container, {
      config: makeConfig({ host: 'localhost', port: 6379 }) as never,
      environment: 'production',
    })
    const resolved = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
    expect(resolved).toBeInstanceOf(BullMQQueueClientImpl)
  })

  it('throws when production/development env is missing config.redis', () => {
    registerQueueDI(container, {
      config: makeConfig() as never,
      environment: 'production',
    })
    expect(() => container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)).toThrow(
      /config\.redis is required/,
    )
  })

  it('resolves the same singleton instance on repeated resolve calls', () => {
    registerQueueDI(container, {
      config: makeConfig() as never,
      environment: 'testing',
    })
    const a = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
    const b = container.resolve<QueueClient>(QUEUE_DEPENDENCY_KEY)
    expect(a).toBe(b)
  })
})
