import { dependencyKeys } from '@t/dependency-injection'
import { describe, expect, it, vi } from 'vitest'
import { registerJobHandlers } from './registerJobHandlers'

function buildMockContainer() {
  const queue = {
    registerHandler: vi.fn(),
    enqueue: vi.fn(),
    close: vi.fn(),
  }
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  }
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === dependencyKeys.global.QUEUE) return queue
      if (key === dependencyKeys.global.LOGGER) return logger
      throw new Error(`Unknown key: ${key}`)
    }),
  }
  return { container, queue, logger }
}

describe('registerJobHandlers', () => {
  it('registers the ping handler', () => {
    const { container, queue } = buildMockContainer()
    registerJobHandlers(container as never)

    const names = queue.registerHandler.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('ping')
  })

  it('registers the heartbeat handler', () => {
    const { container, queue } = buildMockContainer()
    registerJobHandlers(container as never)

    const names = queue.registerHandler.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('heartbeat')
  })

  it('registers exactly the expected job names', () => {
    const { container, queue } = buildMockContainer()
    registerJobHandlers(container as never)

    const names = queue.registerHandler.mock.calls.map((c) => c[0] as string)
    expect(names.sort()).toEqual(['heartbeat', 'ping'])
  })

  it('each registered value is a function', () => {
    const { container, queue } = buildMockContainer()
    registerJobHandlers(container as never)

    for (const [, handler] of queue.registerHandler.mock.calls) {
      expect(typeof handler).toBe('function')
    }
  })
})
