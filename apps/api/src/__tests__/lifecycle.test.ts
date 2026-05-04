/**
 * Unit tests for installProcessHandlers (apps/api/src/lifecycle.ts).
 *
 * Because `process.on('unhandledRejection')` and `process.on('uncaughtException')`
 * are difficult to trigger in isolation without affecting the vitest process,
 * we extract the registered listener directly via `process.listeners(event)[n]`
 * and invoke it manually. This keeps coverage complete without requiring a
 * real crash.
 */

import { shutdownLogging } from '@t/logging'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installProcessHandlers } from '../lifecycle'
import type { AwilixContainer } from 'awilix'

vi.mock('@t/logging', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    requestId: 'global',
    userId: undefined,
  }
  return {
    shutdownLogging: vi.fn().mockResolvedValue(undefined),
    createGlobalLogger: vi.fn().mockReturnValue(mockLogger),
    GlobalLogger: class {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnThis()
      requestId = 'global'
      userId = undefined
    },
    RequestLogger: class {
      error = vi.fn()
      warn = vi.fn()
      warning = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      fatal = vi.fn()
      child = vi.fn().mockReturnThis()
      requestId = 'request'
      userId = undefined
    },
  }
})

function buildMockContainer() {
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    requestId: 'global',
    userId: undefined,
  }
  const analytics = {
    captureException: vi.fn(),
    capture: vi.fn(),
    shutdown: vi.fn(),
  }
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === 'logger') return logger
      if (key === 'analytics') return analytics
      throw new Error(`Unknown key: ${key}`)
    }),
  }
  return { container, logger, analytics }
}

describe('installProcessHandlers', () => {
  let rejectionListenersBefore: Array<NodeJS.UnhandledRejectionListener>
  let exceptionListenersBefore: Array<NodeJS.UncaughtExceptionListener>
  let mocks: ReturnType<typeof buildMockContainer>

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    rejectionListenersBefore = [...process.listeners('unhandledRejection')]
    exceptionListenersBefore = [...process.listeners('uncaughtException')]
    mocks = buildMockContainer()
    installProcessHandlers(mocks.container as unknown as AwilixContainer)
  })

  afterEach(() => {
    // Remove the handlers added by installProcessHandlers to avoid polluting
    // later tests.  We remove everything that was not there before.
    const currentRejection = process.listeners('unhandledRejection')
    for (const listener of currentRejection) {
      if (!rejectionListenersBefore.includes(listener)) {
        process.removeListener('unhandledRejection', listener as NodeJS.UnhandledRejectionListener)
      }
    }
    const currentException = process.listeners('uncaughtException')
    for (const listener of currentException) {
      if (!exceptionListenersBefore.includes(listener)) {
        process.removeListener('uncaughtException', listener as NodeJS.UncaughtExceptionListener)
      }
    }
  })

  // ── unhandledRejection ────────────────────────────────────────────────────

  it('registers an unhandledRejection listener', () => {
    const count = process.listeners('unhandledRejection').length
    expect(count).toBeGreaterThan(rejectionListenersBefore.length)
  })

  it('unhandledRejection handler: logs error when reason is an Error', () => {
    const listeners = process.listeners('unhandledRejection') as Array<(reason: unknown) => void>
    const handler = listeners[listeners.length - 1]
    const err = new Error('test rejection')
    handler(err)

    expect(mocks.logger.error).toHaveBeenCalledOnce()
    const arg = mocks.logger.error.mock.calls[0][0] as Record<string, unknown>
    expect(arg.message).toBe('unhandledRejection')
    expect(arg.error).toBe(err)
  })

  it('unhandledRejection handler: wraps non-Error reason in new Error', () => {
    const listeners = process.listeners('unhandledRejection') as Array<(reason: unknown) => void>
    const handler = listeners[listeners.length - 1]
    handler('string rejection reason')

    expect(mocks.logger.error).toHaveBeenCalledOnce()
    const arg = mocks.logger.error.mock.calls[0][0] as Record<string, unknown>
    expect(arg.error).toBeInstanceOf(Error)
    expect((arg.error as Error).message).toBe('string rejection reason')
  })

  it('unhandledRejection handler: calls analytics.captureException with system distinctId', () => {
    const listeners = process.listeners('unhandledRejection') as Array<(reason: unknown) => void>
    const handler = listeners[listeners.length - 1]
    const err = new Error('analytics test')
    handler(err)

    expect(mocks.analytics.captureException).toHaveBeenCalledOnce()
    const [capturedErr, distinctId, props] = mocks.analytics.captureException.mock.calls[0] as [
      Error,
      string,
      Record<string, unknown>,
    ]
    expect(capturedErr).toBe(err)
    expect(distinctId).toBe('system')
    expect(props.source).toBe('unhandledRejection')
  })

  // ── uncaughtException ────────────────────────────────────────────────────

  it('registers an uncaughtException listener', () => {
    const count = process.listeners('uncaughtException').length
    expect(count).toBeGreaterThan(exceptionListenersBefore.length)
  })

  it('uncaughtException handler: logs error', () => {
    const listeners = process.listeners('uncaughtException') as Array<(err: Error) => void>
    const handler = listeners[listeners.length - 1]
    const err = new Error('uncaught')
    handler(err)

    expect(mocks.logger.error).toHaveBeenCalledOnce()
    const arg = mocks.logger.error.mock.calls[0][0] as Record<string, unknown>
    expect(arg.message).toBe('uncaughtException')
    expect(arg.error).toBe(err)
  })

  it('uncaughtException handler: calls analytics.captureException with system distinctId', () => {
    const listeners = process.listeners('uncaughtException') as Array<(err: Error) => void>
    const handler = listeners[listeners.length - 1]
    const err = new Error('exception')
    handler(err)

    expect(mocks.analytics.captureException).toHaveBeenCalledOnce()
    const [capturedErr, distinctId, props] = mocks.analytics.captureException.mock.calls[0] as [
      Error,
      string,
      Record<string, unknown>,
    ]
    expect(capturedErr).toBe(err)
    expect(distinctId).toBe('system')
    expect(props.source).toBe('uncaughtException')
  })

  it('uncaughtException handler: does NOT call process.exit', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never)
    const listeners = process.listeners('uncaughtException') as Array<(err: Error) => void>
    const handler = listeners[listeners.length - 1]
    handler(new Error('no exit'))

    expect(exitSpy).not.toHaveBeenCalled()
    exitSpy.mockRestore()
  })

  // ── SIGTERM / SIGINT ─────────────────────────────────────────────────────────

  it('registers a SIGTERM listener', () => {
    const count = process.listeners('SIGTERM').length
    expect(count).toBeGreaterThan(0)
  })

  it('registers a SIGINT listener', () => {
    const count = process.listeners('SIGINT').length
    expect(count).toBeGreaterThan(0)
  })

  it('SIGTERM flushes logs once and logs graceful shutdown', async () => {
    const listeners = process.listeners('SIGTERM') as Array<() => Promise<void>>
    const handler = listeners[listeners.length - 1]

    // Call the handler
    await handler()

    // Verify logger.info called with expected messages
    expect(mocks.logger.info).toHaveBeenCalledTimes(2)
    const firstCall = mocks.logger.info.mock.calls[0][0] as string
    const secondCall = mocks.logger.info.mock.calls[1][0] as string
    expect(firstCall).toMatch(/Received SIGTERM, shutting down\.\.\./)
    expect(secondCall).toMatch(/Graceful shutdown complete\./)
  })

  it('second signal does not re-flush (idempotency)', async () => {
    const listeners = process.listeners('SIGTERM') as Array<() => Promise<void>>
    const handler = listeners[listeners.length - 1]

    // Call handler twice
    await handler()
    await handler()

    // Should only have logged once for each message (idempotent guard)
    expect(mocks.logger.info).toHaveBeenCalledTimes(2)
  })
})

// ── queue.close() on SIGTERM ─────────────────────────────────────────────────

describe('installProcessHandlers — queue.close on SIGTERM', () => {
  // biome-ignore lint/suspicious/noExplicitAny: listener type varies across Node versions
  let sigtermListenersBefore: Array<any>

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    sigtermListenersBefore = [...process.listeners('SIGTERM')]
  })

  afterEach(() => {
    const current = process.listeners('SIGTERM')
    for (const listener of current) {
      if (!sigtermListenersBefore.includes(listener)) {
        // biome-ignore lint/suspicious/noExplicitAny: listener type varies across Node versions
        process.removeListener('SIGTERM', listener as any)
      }
    }
  })

  it('calls queue.close() on SIGTERM when queue is registered', async () => {
    const queue = { close: vi.fn().mockResolvedValue(undefined) }
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      requestId: 'global',
      userId: undefined,
    }
    const analytics = { captureException: vi.fn(), capture: vi.fn(), shutdown: vi.fn() }
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === 'logger') return logger
        if (key === 'analytics') return analytics
        if (key === 'queue') return queue
        throw new Error(`Unknown key: ${key}`)
      }),
    }

    installProcessHandlers(container as unknown as AwilixContainer)

    const listeners = process.listeners('SIGTERM') as Array<() => Promise<void>>
    await listeners[listeners.length - 1]()

    expect(queue.close).toHaveBeenCalledOnce()
  })

  it('does not throw when queue is not registered (close silently skipped)', async () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      requestId: 'global',
      userId: undefined,
    }
    const analytics = { captureException: vi.fn(), capture: vi.fn(), shutdown: vi.fn() }
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === 'logger') return logger
        if (key === 'analytics') return analytics
        throw new Error(`Unknown key: ${key}`)
      }),
    }

    installProcessHandlers(container as unknown as AwilixContainer)

    const listeners = process.listeners('SIGTERM') as Array<() => Promise<void>>
    await expect(listeners[listeners.length - 1]()).resolves.toBeUndefined()
  })

  it('does not propagate error when shutdownLogging throws', async () => {
    vi.mocked(shutdownLogging).mockRejectedValueOnce(new Error('flush failed'))

    const queue = { close: vi.fn().mockResolvedValue(undefined) }
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      requestId: 'global',
      userId: undefined,
    }
    const analytics = { captureException: vi.fn(), capture: vi.fn(), shutdown: vi.fn() }
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === 'logger') return logger
        if (key === 'analytics') return analytics
        if (key === 'queue') return queue
        throw new Error(`Unknown key: ${key}`)
      }),
    }

    installProcessHandlers(container as unknown as AwilixContainer)

    const listeners = process.listeners('SIGTERM') as Array<() => Promise<void>>
    await expect(listeners[listeners.length - 1]()).resolves.toBeUndefined()
  })
})
