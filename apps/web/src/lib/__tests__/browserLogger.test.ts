import { beforeAll, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @t/logging-browser — provide a stub getLogger so the re-export module
// has a concrete value to bind at module load time.
// ---------------------------------------------------------------------------
const { stubGetLogger } = vi.hoisted(() => {
  const stubGetLogger = vi.fn()
  return { stubGetLogger }
})

vi.mock('@t/logging-browser', () => ({
  getLogger: stubGetLogger,
}))

// ---------------------------------------------------------------------------
// Load the re-export module after mocks are registered.
// ---------------------------------------------------------------------------
let getLogger: unknown

beforeAll(async () => {
  const mod = await import('../browserLogger.js')
  getLogger = mod.getLogger
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('browserLogger re-exports', () => {
  test('getLogger is re-exported from @t/logging-browser', () => {
    expect(getLogger).toBe(stubGetLogger)
  })

  test('getLogger is a function', () => {
    expect(typeof getLogger).toBe('function')
  })
})
