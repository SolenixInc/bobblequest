import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock @revenuecat/purchases-js ────────────────────────────────────────────
// All tests in this file use a dynamic import of RevenueCatBrowserBilling, so
// the mock factory runs before any import of the module under test.

const mockChangeUser = vi.fn().mockResolvedValue(undefined)
const mockGetCustomerInfo = vi.fn()
const mockGetOfferings = vi.fn()
const mockPurchase = vi.fn()
const mockConfigure = vi.fn()

const mockSharedInstance = {
  changeUser: mockChangeUser,
  getCustomerInfo: mockGetCustomerInfo,
  getOfferings: mockGetOfferings,
  purchase: mockPurchase,
}

vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: {
    configure: mockConfigure,
    getSharedInstance: vi.fn(() => mockSharedInstance),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

async function freshBilling() {
  // Dynamic import re-executes with the mocked module; reset mocks between tests.
  const { RevenueCatBrowserBilling } = await import(
    '../../src/infrastructure/RevenueCatBrowserBilling'
  )
  return new RevenueCatBrowserBilling()
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RevenueCatBrowserBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── configure ──────────────────────────────────────────────────────────────

  describe('configure()', () => {
    it('calls Purchases.configure with apiKey and appUserId on first call', async () => {
      const billing = await freshBilling()
      await billing.configure({ apiKey: 'rcb_key', appUserId: 'user_1' })

      expect(mockConfigure).toHaveBeenCalledOnce()
      expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'rcb_key', appUserId: 'user_1' })
    })

    it('does not configure when appUserId is absent on first call', async () => {
      const billing = await freshBilling()
      await billing.configure({ apiKey: 'rcb_key' })

      // appUserId is required at configure time; call is deferred.
      expect(mockConfigure).not.toHaveBeenCalled()
    })

    it('calls changeUser instead of configure on subsequent calls', async () => {
      const billing = await freshBilling()
      await billing.configure({ apiKey: 'rcb_key', appUserId: 'user_1' })
      await billing.configure({ apiKey: 'rcb_key', appUserId: 'user_2' })

      expect(mockConfigure).toHaveBeenCalledOnce()
      expect(mockChangeUser).toHaveBeenCalledOnce()
      expect(mockChangeUser).toHaveBeenCalledWith('user_2')
    })

    it('does nothing when already configured and no new appUserId is supplied', async () => {
      const billing = await freshBilling()
      await billing.configure({ apiKey: 'rcb_key', appUserId: 'user_1' })
      await billing.configure({ apiKey: 'rcb_key' }) // no appUserId

      expect(mockConfigure).toHaveBeenCalledOnce()
      expect(mockChangeUser).not.toHaveBeenCalled()
    })
  })

  // ── getCustomerInfo ────────────────────────────────────────────────────────

  describe('getCustomerInfo()', () => {
    it('maps active entitlements from RC shape to port CustomerInfo shape', async () => {
      const billing = await freshBilling()

      const mockExpiry = new Date('2027-06-01T00:00:00Z')
      mockGetCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            pro: { identifier: 'pro', isActive: true, expirationDate: mockExpiry },
          },
        },
      })

      const result = await billing.getCustomerInfo()

      expect(result.entitlements.active).toEqual({
        pro: {
          identifier: 'pro',
          isActive: true,
          expirationDate: '2027-06-01T00:00:00.000Z',
        },
      })
    })

    it('handles a null expirationDate (perpetual entitlement)', async () => {
      const billing = await freshBilling()

      mockGetCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            basic: { identifier: 'basic', isActive: true, expirationDate: null },
          },
        },
      })

      const result = await billing.getCustomerInfo()

      expect(result.entitlements.active.basic.expirationDate).toBeNull()
    })

    it('handles a string expirationDate (already ISO-formatted by RC)', async () => {
      const billing = await freshBilling()

      mockGetCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            pro: { identifier: 'pro', isActive: true, expirationDate: '2027-01-01T00:00:00Z' },
          },
        },
      })

      const result = await billing.getCustomerInfo()

      expect(result.entitlements.active.pro.expirationDate).toBe('2027-01-01T00:00:00Z')
    })

    it('returns empty active entitlements when none are active', async () => {
      const billing = await freshBilling()

      mockGetCustomerInfo.mockResolvedValue({
        entitlements: { active: {} },
      })

      const result = await billing.getCustomerInfo()
      expect(result.entitlements.active).toEqual({})
    })
  })

  // ── purchase ───────────────────────────────────────────────────────────────

  describe('purchase()', () => {
    it('calls getOfferings and purchase on the shared instance', async () => {
      const billing = await freshBilling()

      const rcPackage = { identifier: 'premium_monthly' }
      mockGetOfferings.mockResolvedValue({
        current: { availablePackages: [rcPackage] },
      })
      mockPurchase.mockResolvedValue({})

      const result = await billing.purchase({ packageId: 'premium_monthly' })

      expect(mockPurchase).toHaveBeenCalledWith({ rcPackage })
      expect(result).toEqual({ ok: true })
    })

    it('throws when there is no current offering', async () => {
      const billing = await freshBilling()

      mockGetOfferings.mockResolvedValue({ current: null })

      await expect(billing.purchase({ packageId: 'premium_monthly' })).rejects.toThrow(
        'No current offering available',
      )
    })

    it('throws when the requested package is not in the current offering', async () => {
      const billing = await freshBilling()

      mockGetOfferings.mockResolvedValue({
        current: { availablePackages: [{ identifier: 'other_pkg' }] },
      })

      await expect(billing.purchase({ packageId: 'premium_monthly' })).rejects.toThrow(
        'Package "premium_monthly" not found in current offering',
      )
    })
  })
})
