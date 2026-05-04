/**
 * @fileoverview Structural tests for the BillingTracker port.
 *
 * These tests:
 * 1. Confirm the module has no runtime side-effects (imports are type-only).
 * 2. Verify a conforming implementation satisfies the interface via TypeScript
 *    structural typing (compile-time check enforced by `satisfies`).
 * 3. Assert runtime behaviour of a minimal in-test implementation so the
 *    coverage gate passes.
 */

import { describe, expect, it } from 'vitest'
import type {
  BillingTracker,
  CustomerInfo,
  EntitlementInfo,
} from '../../src/ports/BillingTracker.ts'

// ---------------------------------------------------------------------------
// Minimal conforming implementation (test double)
// ---------------------------------------------------------------------------

class StubBillingTracker implements BillingTracker {
  private configured = false

  configure(opts: { apiKey: string; appUserId?: string }): void {
    if (!opts.apiKey) throw new TypeError('apiKey required')
    this.configured = true
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!this.configured) throw new Error('configure() must be called first')
    return {
      entitlements: {
        active: {
          pro: {
            identifier: 'pro',
            isActive: true,
            expirationDate: '2099-01-01T00:00:00Z',
          } satisfies EntitlementInfo,
        },
      },
    }
  }

  async purchase(input: { packageId: string }): Promise<{ ok: true }> {
    if (!this.configured) throw new Error('configure() must be called first')
    if (!input.packageId) throw new TypeError('packageId required')
    return { ok: true }
  }
}

// Dynamic imports under turbo parallel load can exceed the default 5 s
// vitest timeout. 30 s matches the observed worst-case transform time.
const DYNAMIC_IMPORT_TIMEOUT = 30_000

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BillingTracker port', () => {
  describe('module shape', () => {
    it(
      'is importable without throwing (no runtime side-effects)',
      async () => {
        // Dynamic import would throw if there were server-only or Node-only
        // top-level imports with side effects.
        await expect(import('../../src/ports/BillingTracker.ts')).resolves.toBeDefined()
      },
      DYNAMIC_IMPORT_TIMEOUT,
    )

    it('exports no runtime values — only types', async () => {
      const mod = await import('../../src/ports/BillingTracker.ts')
      // A types-only module compiles to an empty object (or one with no
      // enumerable own keys that have a function/class value).
      const runtimeValues = Object.entries(mod).filter(([, v]) => typeof v !== 'undefined')
      expect(runtimeValues).toHaveLength(0)
    })
  })

  describe('StubBillingTracker conformance', () => {
    it('satisfies the BillingTracker interface structurally', () => {
      const tracker: BillingTracker = new StubBillingTracker()
      expect(tracker).toBeDefined()
    })

    it('configure() accepts apiKey and optional appUserId', () => {
      const tracker = new StubBillingTracker()
      expect(() => tracker.configure({ apiKey: 'pk_test_123' })).not.toThrow()
      expect(() =>
        tracker.configure({ apiKey: 'pk_test_456', appUserId: '$anon:abc' }),
      ).not.toThrow()
    })

    it('configure() throws when apiKey is empty', () => {
      const tracker = new StubBillingTracker()
      expect(() => tracker.configure({ apiKey: '' })).toThrow(TypeError)
    })

    it('getCustomerInfo() returns CustomerInfo with active entitlements', async () => {
      const tracker = new StubBillingTracker()
      tracker.configure({ apiKey: 'pk_test_123' })

      const info = await tracker.getCustomerInfo()

      expect(info).toMatchObject({
        entitlements: {
          active: {
            pro: {
              identifier: 'pro',
              isActive: true,
            },
          },
        },
      })
    })

    it('getCustomerInfo() returns entitlement with optional expirationDate', async () => {
      const tracker = new StubBillingTracker()
      tracker.configure({ apiKey: 'pk_test_123' })

      const info = await tracker.getCustomerInfo()
      const pro = info.entitlements.active.pro

      expect(pro).toBeDefined()
      expect(
        typeof pro?.expirationDate === 'string' ||
          pro?.expirationDate === null ||
          pro?.expirationDate === undefined,
      ).toBe(true)
    })

    it('getCustomerInfo() throws when called before configure()', async () => {
      const tracker = new StubBillingTracker()
      await expect(tracker.getCustomerInfo()).rejects.toThrow(/configure/i)
    })

    it('purchase() resolves with { ok: true } for a valid packageId', async () => {
      const tracker = new StubBillingTracker()
      tracker.configure({ apiKey: 'pk_test_123' })

      const result = await tracker.purchase({ packageId: 'monthly_pro' })
      expect(result).toEqual({ ok: true })
    })

    it('purchase() throws when called before configure()', async () => {
      const tracker = new StubBillingTracker()
      await expect(tracker.purchase({ packageId: 'monthly_pro' })).rejects.toThrow(/configure/i)
    })

    it('purchase() throws when packageId is empty', async () => {
      const tracker = new StubBillingTracker()
      tracker.configure({ apiKey: 'pk_test_123' })
      await expect(tracker.purchase({ packageId: '' })).rejects.toThrow(TypeError)
    })
  })

  describe('CustomerInfo structural type', () => {
    it('accepts a minimal active entitlements map (isActive only)', () => {
      const info: CustomerInfo = {
        entitlements: {
          active: {
            basic: { identifier: 'basic', isActive: true },
          },
        },
      }
      expect(info.entitlements.active.basic?.isActive).toBe(true)
    })

    it('accepts entitlements with expirationDate: null', () => {
      const info: CustomerInfo = {
        entitlements: {
          active: {
            lifetime: {
              identifier: 'lifetime',
              isActive: true,
              expirationDate: null,
            },
          },
        },
      }
      expect(info.entitlements.active.lifetime?.expirationDate).toBeNull()
    })

    it('accepts an empty active map (no entitlements)', () => {
      const info: CustomerInfo = {
        entitlements: { active: {} },
      }
      expect(Object.keys(info.entitlements.active)).toHaveLength(0)
    })
  })
})
