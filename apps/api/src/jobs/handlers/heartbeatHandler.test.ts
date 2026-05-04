import { describe, expect, it, vi } from 'vitest'
import { heartbeatHandler } from './heartbeatHandler'

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

describe('heartbeatHandler', () => {
  it('logs heartbeat tick via the injected logger', async () => {
    const logger = buildMockLogger()
    const handler = heartbeatHandler(logger as never)

    await handler({})

    expect(logger.info).toHaveBeenCalledOnce()
    const arg = logger.info.mock.calls[0][0] as Record<string, unknown>
    expect(arg.message).toBe('heartbeat tick')
  })
})
