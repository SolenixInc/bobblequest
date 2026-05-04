import { describe, expect, it, vi } from 'vitest'
import { pingHandler } from './pingHandler'

function buildMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  }
}

describe('pingHandler', () => {
  it('logs the payload via the injected logger', async () => {
    const logger = buildMockLogger()
    const handler = pingHandler(logger as never)

    await handler({ message: 'hello' })

    expect(logger.info).toHaveBeenCalledOnce()
    const arg = logger.info.mock.calls[0][0] as Record<string, unknown>
    expect(arg.message).toBe('Worker received ping job')
    expect((arg.metadata as { payload: unknown }).payload).toEqual({ message: 'hello' })
  })
})
