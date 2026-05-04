import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared before any import of the module under test
// ---------------------------------------------------------------------------

const mockContainer = {
  register: vi.fn(),
  resolve: vi.fn(),
}

vi.mock('@t/dependency-injection', () => ({
  createContainer: vi.fn(() => mockContainer),
  dependencyKeys: {
    global: { CONFIG: 'config', LOGGER_FACTORY: 'loggerFactory', LOGGER: 'logger' },
  },
}))

vi.mock('@t/config', () => ({
  MobileConfigValuesSchema: {},
  registerConfigRepo: vi.fn(),
}))

vi.mock('@t/logging-rn', () => ({
  registerLoggerRnDI: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('buildContainer()', () => {
    it('creates a container and calls both registrar functions', async () => {
      const { createContainer } = await import('@t/dependency-injection')
      const { registerConfigRepo } = await import('@t/config')
      const { registerLoggerRnDI } = await import('@t/logging-rn')
      const { buildContainer } = await import('../composition')

      const container = buildContainer()

      expect(createContainer).toHaveBeenCalledOnce()
      expect(registerConfigRepo).toHaveBeenCalledOnce()
      expect(registerLoggerRnDI).toHaveBeenCalledOnce()
      expect(container).toBe(mockContainer)
    })
  })

  describe('getContainer()', () => {
    it('returns a container instance', async () => {
      const { getContainer } = await import('../composition')
      const c = getContainer()
      expect(c).toBeDefined()
    })

    it('returns the same singleton on subsequent calls', async () => {
      const { getContainer } = await import('../composition')
      const c1 = getContainer()
      const c2 = getContainer()
      expect(c1).toBe(c2)
    })
  })
})
