import { describe, expect, it, vi } from 'vitest'
import { Logger } from '../ports/Logger.ts'

class TestLogger extends Logger {
  requestId = 'test'
  userId = undefined
  debug = vi.fn()
  info = vi.fn()
  warn = vi.fn()
  error = vi.fn()
  fatal = vi.fn()
  child = vi.fn()
}

describe('Logger', () => {
  it('warning() delegates to warn()', () => {
    const logger = new TestLogger()
    const arg = { message: 'test' }
    logger.warning(arg, 'extra')
    expect(logger.warn).toHaveBeenCalledWith(arg, 'extra')
  })
})
