import { beforeEach, describe, expect, test, vi } from 'vitest'

// Stub 'server-only' so Vitest (Node context) doesn't throw.
vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Mocks — declared before any import of the module under test.
// ---------------------------------------------------------------------------

const mockContainer = {
  resolve: vi.fn(),
  register: vi.fn(),
}

const mockCreateContainer = vi.fn(() => mockContainer)
const mockRegisterConfigRepo = vi.fn()
const mockRegisterLoggerFactoryDI = vi.fn()
const mockRegisterLoggerDI = vi.fn()
const mockRegisterAnalyticsDI = vi.fn()

vi.mock('@t/dependency-injection', () => ({
  createContainer: mockCreateContainer,
  dependencyKeys: {
    global: {
      CONFIG: 'config',
      ANALYTICS: 'analytics',
      LOGGER: 'logger',
      LOGGER_FACTORY: 'loggerFactory',
    },
    request: {
      REQUEST_ANALYTICS: 'requestAnalytics',
    },
  },
}))

vi.mock('@t/config', () => ({
  WebConfigValuesSchema: {
    parse: vi.fn(() => ({ system: { environment: 'test' } })),
    safeParse: vi.fn(() => ({ success: true, data: { system: { environment: 'test' } } })),
  },
  registerConfigRepo: mockRegisterConfigRepo,
}))

vi.mock('@t/logging', () => ({
  registerLoggerDI: mockRegisterLoggerDI,
  registerLoggerFactoryDI: mockRegisterLoggerFactoryDI,
}))

vi.mock('@t/analytics', () => ({
  registerAnalyticsDI: mockRegisterAnalyticsDI,
}))

// ---------------------------------------------------------------------------
// The module under test is imported after mocks are declared. Because
// composition.ts holds a module-level `_container` singleton, we must
// reset modules between tests that need a fresh singleton.
// ---------------------------------------------------------------------------

describe('getContainer', () => {
  beforeEach(() => {
    // Reset all call history so counts stay clean between tests.
    mockCreateContainer.mockClear()
    mockRegisterConfigRepo.mockClear()
    mockRegisterLoggerFactoryDI.mockClear()
    mockRegisterLoggerDI.mockClear()
    mockRegisterAnalyticsDI.mockClear()
    mockContainer.resolve.mockClear()

    // Default resolve stub: return a stub config when CONFIG is resolved.
    mockContainer.resolve.mockReturnValue({ system: { environment: 'test' } })
  })

  describe('first call — builds and caches the container', () => {
    test('createContainer is called exactly once', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      expect(mockCreateContainer).toHaveBeenCalledTimes(1)
    })

    test('registerConfigRepo is called once with the container and WebConfigValuesSchema', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      const { WebConfigValuesSchema } = await import('@t/config')
      getContainer()
      expect(mockRegisterConfigRepo).toHaveBeenCalledTimes(1)
      expect(mockRegisterConfigRepo).toHaveBeenCalledWith(mockContainer, {
        schema: WebConfigValuesSchema,
      })
    })

    test('registerLoggerFactoryDI is called once with the container', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      expect(mockRegisterLoggerFactoryDI).toHaveBeenCalledTimes(1)
      expect(mockRegisterLoggerFactoryDI).toHaveBeenCalledWith(mockContainer)
    })

    test('registerLoggerDI is called once with the container and a global context', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      expect(mockRegisterLoggerDI).toHaveBeenCalledTimes(1)
      expect(mockRegisterLoggerDI).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining({
          context: expect.objectContaining({ requestId: 'global' }),
        }),
      )
    })

    test('registerAnalyticsDI is called once with the container, config, and service web', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      expect(mockRegisterAnalyticsDI).toHaveBeenCalledTimes(1)
      expect(mockRegisterAnalyticsDI).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining({ service: 'web' }),
      )
    })

    test('returns the container produced by createContainer', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      const result = getContainer()
      expect(result).toBe(mockContainer)
    })
  })

  describe('environment fallback — config without system property', () => {
    test('falls back to "development" when config.system is undefined', async () => {
      vi.resetModules()
      // Return a config with no `system` key so the `?? 'development'` branch fires.
      mockContainer.resolve.mockReturnValue({})
      const { getContainer } = await import('../composition.js')
      // Should not throw; registerAnalyticsDI receives environment 'development'.
      getContainer()
      expect(mockRegisterAnalyticsDI).toHaveBeenCalledWith(
        mockContainer,
        expect.objectContaining({ environment: 'development' }),
      )
    })
  })

  describe('second call — returns cached container, no re-registration', () => {
    test('returns the same container reference on repeated calls', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      const first = getContainer()
      const second = getContainer()
      expect(first).toBe(second)
    })

    test('createContainer is called only once across multiple getContainer calls', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      getContainer()
      getContainer()
      expect(mockCreateContainer).toHaveBeenCalledTimes(1)
    })

    test('no registrar is called again on subsequent getContainer calls', async () => {
      vi.resetModules()
      const { getContainer } = await import('../composition.js')
      getContainer()
      mockRegisterConfigRepo.mockClear()
      mockRegisterLoggerFactoryDI.mockClear()
      mockRegisterLoggerDI.mockClear()
      mockRegisterAnalyticsDI.mockClear()

      getContainer()
      getContainer()

      expect(mockRegisterConfigRepo).not.toHaveBeenCalled()
      expect(mockRegisterLoggerFactoryDI).not.toHaveBeenCalled()
      expect(mockRegisterLoggerDI).not.toHaveBeenCalled()
      expect(mockRegisterAnalyticsDI).not.toHaveBeenCalled()
    })
  })
})
