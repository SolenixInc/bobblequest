import { createContainer } from '@t/dependency-injection'
import type { Container } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type BrowserConfigAccessor,
  registerBillingBrowserDI,
} from '../../src/dependency-injection/registerBillingBrowserDI'
import { NoOpBillingTracker } from '../../src/infrastructure/NoOpBillingTracker'
import { RevenueCatBrowserBilling } from '../../src/infrastructure/RevenueCatBrowserBilling'

// Mock the RevenueCat SDK so no real network calls are made.
vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: {
    configure: vi.fn(),
    getSharedInstance: vi.fn(() => ({
      changeUser: vi.fn().mockResolvedValue(undefined),
      getCustomerInfo: vi.fn().mockResolvedValue({ entitlements: { active: {} } }),
      getOfferings: vi.fn().mockResolvedValue({ current: null }),
      purchase: vi.fn().mockResolvedValue({}),
    })),
  },
}))

// Mock container spy factory — verifies register is called with the right shape.
function createMockContainer(): Container {
  return {
    register: vi.fn(),
    resolve: vi.fn(),
  } as unknown as Container
}

function makeConfig(overrides: Record<string, string | undefined> = {}): BrowserConfigAccessor {
  const base: Record<string, string | undefined> = {
    NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: 'rcb_test_key',
  }
  return {
    get: (key: string): string | undefined => (key in overrides ? overrides[key] : base[key]),
  }
}

describe('registerBillingBrowserDI', () => {
  let container: Container

  beforeEach(() => {
    container = createMockContainer()
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls container.register exactly once', () => {
    registerBillingBrowserDI(container, { config: makeConfig() })
    expect(container.register).toHaveBeenCalledOnce()
  })

  it('registers under the "billingTracker" key', () => {
    registerBillingBrowserDI(container, { config: makeConfig() })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).toHaveProperty('billingTracker')
  })

  describe('pickTracker — noOp: true', () => {
    it('resolves a NoOpBillingTracker subclass when noOp is true', () => {
      const real = createContainer()
      registerBillingBrowserDI(real, { config: makeConfig(), noOp: true })
      const tracker = real.resolve('billingTracker')
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
    })

    it('resolves NoOp even when API key is present and window is defined', () => {
      const real = createContainer()
      registerBillingBrowserDI(real, { config: makeConfig(), noOp: true })
      const tracker = real.resolve('billingTracker')
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
    })
  })

  describe('pickTracker — SSR (window undefined)', () => {
    it('resolves NoOpBillingTracker subclass when window is explicitly undefined', () => {
      // jsdom provides window at the environment level; stub it to undefined to
      // simulate SSR where typeof window === 'undefined'.
      vi.stubGlobal('window', undefined)
      const real = createContainer()
      registerBillingBrowserDI(real, { config: makeConfig() })
      const tracker = real.resolve('billingTracker')
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
    })
  })

  describe('pickTracker — missing API key', () => {
    it('resolves NoOpBillingTracker and logs a warning when key is absent', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const real = createContainer()
      registerBillingBrowserDI(real, {
        config: makeConfig({ NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: undefined }),
      })
      const tracker = real.resolve('billingTracker')
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Billing disabled'))
      warnSpy.mockRestore()
    })
  })

  describe('pickTracker — browser + valid key', () => {
    it('resolves RevenueCatBrowserBilling when window exists and key is set', () => {
      const real = createContainer()
      registerBillingBrowserDI(real, { config: makeConfig() })
      const tracker = real.resolve('billingTracker')
      expect(tracker).toBeInstanceOf(RevenueCatBrowserBilling)
    })
  })

  describe('singleton lifetime', () => {
    it('returns the same instance on repeated resolves (singleton)', () => {
      const real = createContainer()
      registerBillingBrowserDI(real, { config: makeConfig() })
      const t1 = real.resolve('billingTracker')
      const t2 = real.resolve('billingTracker')
      expect(t1).toBe(t2)
    })
  })
})
