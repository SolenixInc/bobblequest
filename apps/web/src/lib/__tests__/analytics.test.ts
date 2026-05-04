import { beforeAll, describe, expect, test, vi } from 'vitest'

// Stub 'server-only' so Vitest (Node context) doesn't throw.
vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Hoisted stubs — vi.hoisted() runs before vi.mock() factory evaluation, so
// these refs are safe to use inside mock factories.
// ---------------------------------------------------------------------------
const { stubAnalytics, mockResolve, mockContainer } = vi.hoisted(() => {
  const stubAnalytics = { track: vi.fn(), identify: vi.fn() }
  const mockResolve = vi.fn().mockReturnValue(stubAnalytics)
  const mockContainer = { resolve: mockResolve }
  return { stubAnalytics, mockResolve, mockContainer }
})

vi.mock('../composition.js', () => ({
  getContainer: vi.fn(() => mockContainer),
}))

vi.mock('@t/dependency-injection', () => ({
  dependencyKeys: {
    global: {
      ANALYTICS: 'analytics',
      LOGGER: 'logger',
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
let analyticsExport: unknown
let resolveCallArg: unknown

beforeAll(async () => {
  const mod = await import('../analytics.js')
  analyticsExport = mod.analytics
  // Capture the token arg from the resolve call that happened at module load.
  resolveCallArg = mockResolve.mock.calls[0]?.[0]
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analytics export', () => {
  test('resolves using dependencyKeys.global.ANALYTICS token', () => {
    expect(resolveCallArg).toBe('analytics')
  })

  test('returns the value resolved from the container', () => {
    expect(analyticsExport).toBe(stubAnalytics)
  })
})
