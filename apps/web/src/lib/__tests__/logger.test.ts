import { beforeAll, describe, expect, test, vi } from 'vitest'

// Stub 'server-only' so Vitest (Node context) doesn't throw.
vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Hoisted stubs — vi.hoisted() runs before vi.mock() factory evaluation, so
// these refs are safe to use inside mock factories.
// ---------------------------------------------------------------------------
const { stubLogger, mockResolve, mockContainer } = vi.hoisted(() => {
  const stubLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
  const mockResolve = vi.fn().mockReturnValue(stubLogger)
  const mockContainer = { resolve: mockResolve }
  return { stubLogger, mockResolve, mockContainer }
})

vi.mock('../composition.js', () => ({
  getContainer: vi.fn(() => mockContainer),
}))

vi.mock('@t/dependency-injection', () => ({
  dependencyKeys: {
    global: {
      LOGGER: 'logger',
      ANALYTICS: 'analytics',
      CONFIG: 'config',
      LOGGER_FACTORY: 'loggerFactory',
    },
    request: { REQUEST_ANALYTICS: 'requestAnalytics' },
  },
}))

// ---------------------------------------------------------------------------
// Load the module under test inside beforeAll so we can snapshot mock call
// state immediately after module initialization, before vitest's clearMocks
// fires between tests and wipes the call record.
// ---------------------------------------------------------------------------
let loggerExport: unknown
let resolveCallArg: unknown

beforeAll(async () => {
  const mod = await import('../logger.js')
  loggerExport = mod.logger
  // Capture the token arg from the resolve call that happened at module load.
  resolveCallArg = mockResolve.mock.calls[0]?.[0]
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('logger export', () => {
  test('resolves using dependencyKeys.global.LOGGER token', () => {
    expect(resolveCallArg).toBe('logger')
  })

  test('returns the value resolved from the container', () => {
    expect(loggerExport).toBe(stubLogger)
  })
})
