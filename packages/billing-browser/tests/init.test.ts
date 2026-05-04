import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoOpBillingTracker } from '../src/infrastructure/NoOpBillingTracker'
import { _resetForTests, getBillingTracker, initBillingTracker } from '../src/infrastructure/init'

// Mock the RevenueCatBrowserBilling so tests never touch the real RC SDK.
vi.mock('../src/infrastructure/RevenueCatBrowserBilling', () => ({
  RevenueCatBrowserBilling: class MockRC {
    configure = vi.fn().mockResolvedValue(undefined)
    getCustomerInfo = vi.fn().mockResolvedValue({ entitlements: { active: {} } })
    purchase = vi.fn().mockResolvedValue({ ok: true })
  },
}))

describe('initBillingTracker', () => {
  beforeEach(() => {
    _resetForTests()
    vi.unstubAllGlobals()
  })

  describe('NoOp fallback — no API key', () => {
    it('returns NoOpBillingTracker when apiKey is empty', async () => {
      vi.stubGlobal('window', {})
      const tracker = await initBillingTracker({ apiKey: '' })
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
    })

    it('logs a warning when apiKey is empty in browser env', async () => {
      vi.stubGlobal('window', {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await initBillingTracker({ apiKey: '' })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('publicApiKey is not set'))
      warnSpy.mockRestore()
    })
  })

  describe('NoOp fallback — SSR', () => {
    it('returns NoOpBillingTracker when window is undefined', async () => {
      vi.stubGlobal('window', undefined)
      const tracker = await initBillingTracker({ apiKey: 'rcb_test_key' })
      expect(tracker).toBeInstanceOf(NoOpBillingTracker)
    })
  })

  describe('real adapter — browser + valid key', () => {
    it('returns RevenueCatBrowserBilling in browser with valid key', async () => {
      vi.stubGlobal('window', {})
      const { RevenueCatBrowserBilling } = await import(
        '../src/infrastructure/RevenueCatBrowserBilling'
      )
      const tracker = await initBillingTracker({ apiKey: 'rcb_test_key' })
      expect(tracker).toBeInstanceOf(RevenueCatBrowserBilling)
    })
  })

  describe('idempotency', () => {
    it('returns same instance on subsequent calls with same key', async () => {
      vi.stubGlobal('window', {})
      const t1 = await initBillingTracker({ apiKey: 'rcb_test_key' })
      const t2 = await initBillingTracker({ apiKey: 'rcb_test_key' })
      expect(t1).toBe(t2)
    })

    it('creates new instance when key changes', async () => {
      vi.stubGlobal('window', {})
      const t1 = await initBillingTracker({ apiKey: 'rcb_test_key_a' })
      _resetForTests()
      const t2 = await initBillingTracker({ apiKey: 'rcb_test_key_b' })
      expect(t1).not.toBe(t2)
    })
  })
})

describe('getBillingTracker', () => {
  beforeEach(() => {
    _resetForTests()
    vi.unstubAllGlobals()
  })

  it('throws when not yet initialized', () => {
    expect(() => getBillingTracker()).toThrow('BillingTracker has not been initialized')
  })

  it('returns initialized tracker after initBillingTracker', async () => {
    vi.stubGlobal('window', {})
    const tracker = await initBillingTracker({ apiKey: 'rcb_test_key' })
    expect(getBillingTracker()).toBe(tracker)
  })
})

describe('_resetForTests', () => {
  it('clears the singleton so the next init creates a fresh instance', async () => {
    vi.stubGlobal('window', {})
    const t1 = await initBillingTracker({ apiKey: 'rcb_test_key' })
    _resetForTests()
    const t2 = await initBillingTracker({ apiKey: 'rcb_test_key' })
    // Both are valid instances but not the same reference after reset.
    expect(t1).not.toBe(t2)
  })
})
