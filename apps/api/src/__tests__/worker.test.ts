/**
 * Integration test: boots registerJobHandlers against a mock container
 * backed by InMemoryQueueImpl semantics and asserts handlers are registered.
 */
import { dependencyKeys } from '@t/dependency-injection'
import { describe, expect, it, vi } from 'vitest'
import { registerJobHandlers } from '../jobs/registerJobHandlers'

function buildContainer() {
  const queue = {
    registerHandler: vi.fn(),
    enqueue: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
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

describe('worker — registerJobHandlers integration', () => {
  it('registers handlers for all expected job names', () => {
    const { container, queue } = buildContainer()
    registerJobHandlers(container as never)

    const registeredNames = queue.registerHandler.mock.calls.map((c) => c[0] as string)
    expect(registeredNames).toContain('ping')
    expect(registeredNames).toContain('heartbeat')
  })

  it('resolves QUEUE and LOGGER from the container', () => {
    const { container } = buildContainer()
    registerJobHandlers(container as never)

    expect(container.resolve).toHaveBeenCalledWith(dependencyKeys.global.QUEUE)
    expect(container.resolve).toHaveBeenCalledWith(dependencyKeys.global.LOGGER)
  })
})
