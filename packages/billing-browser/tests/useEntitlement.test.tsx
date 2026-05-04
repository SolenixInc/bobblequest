import type { BillingTracker, CustomerInfo } from '@t/billing/ports'
import { act, cleanup, render, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NoOpBillingTracker } from '../src/infrastructure/NoOpBillingTracker'
import { BillingContext } from '../src/react/BillingProvider'
import { useEntitlement } from '../src/react/useEntitlement'

// Ensure DOM is cleaned between each test.
afterEach(() => {
  cleanup()
})

function TestWrapper({
  tracker: _tracker,
  entitlementId,
}: {
  tracker: BillingTracker
  entitlementId: string
}) {
  const state = useEntitlement(entitlementId)
  return (
    <div>
      <span data-testid="is-loading">{String(state.isLoading)}</span>
      <span data-testid="is-active">{String(state.isActive)}</span>
      <span data-testid="expiration">{state.expirationDate ?? 'none'}</span>
    </div>
  )
}

function renderWithTracker(tracker: BillingTracker, entitlementId: string) {
  return render(
    <BillingContext.Provider value={tracker}>
      <TestWrapper tracker={tracker} entitlementId={entitlementId} />
    </BillingContext.Provider>,
  )
}

describe('useEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('NoOp tracker', () => {
    it('returns isActive: false for any entitlement id', async () => {
      const tracker = new NoOpBillingTracker()

      const { getByTestId } = await act(async () => renderWithTracker(tracker, 'pro'))

      expect(getByTestId('is-active').textContent).toBe('false')
    })

    it('resolves to isLoading: false after mount', async () => {
      const tracker = new NoOpBillingTracker()

      const { getByTestId } = await act(async () => renderWithTracker(tracker, 'pro'))

      expect(getByTestId('is-loading').textContent).toBe('false')
    })

    it('returns no expiration date for NoOp', async () => {
      const tracker = new NoOpBillingTracker()

      const { getByTestId } = await act(async () => renderWithTracker(tracker, 'pro'))

      expect(getByTestId('expiration').textContent).toBe('none')
    })
  })

  describe('active entitlement', () => {
    it('returns isActive: true when entitlement is in active map', async () => {
      const activeCustomerInfo: CustomerInfo = {
        entitlements: {
          active: {
            pro: {
              identifier: 'pro',
              isActive: true,
              expirationDate: '2027-01-01T00:00:00Z',
            },
          },
        },
      }

      const tracker: BillingTracker = {
        configure: vi.fn(),
        getCustomerInfo: vi.fn().mockResolvedValue(activeCustomerInfo),
        purchase: vi.fn().mockResolvedValue({ ok: true }),
      }

      const { getByTestId } = await act(async () => renderWithTracker(tracker, 'pro'))

      expect(getByTestId('is-active').textContent).toBe('true')
      expect(getByTestId('expiration').textContent).toBe('2027-01-01T00:00:00Z')
    })
  })

  describe('isLoading flow', () => {
    it('starts as isLoading: true, then resolves to false', async () => {
      let resolveCustomerInfo!: (v: CustomerInfo) => void
      const slowPromise = new Promise<CustomerInfo>((res) => {
        resolveCustomerInfo = res
      })

      const tracker: BillingTracker = {
        configure: vi.fn(),
        getCustomerInfo: vi.fn().mockReturnValue(slowPromise),
        purchase: vi.fn().mockResolvedValue({ ok: true }),
      }

      const { container } = render(
        <BillingContext.Provider value={tracker}>
          <TestWrapper tracker={tracker} entitlementId="pro" />
        </BillingContext.Provider>,
      )

      const q = within(container)

      // Before resolution: isLoading should be true.
      expect(q.getByTestId('is-loading').textContent).toBe('true')

      // Resolve the promise.
      await act(async () => {
        resolveCustomerInfo({ entitlements: { active: {} } })
      })

      expect(q.getByTestId('is-loading').textContent).toBe('false')
    })
  })

  describe('error handling', () => {
    it('resets to isActive: false, isLoading: false when getCustomerInfo rejects', async () => {
      const tracker: BillingTracker = {
        configure: vi.fn(),
        getCustomerInfo: vi.fn().mockRejectedValue(new Error('network error')),
        purchase: vi.fn().mockResolvedValue({ ok: true }),
      }

      const { getByTestId } = await act(async () => renderWithTracker(tracker, 'pro'))

      expect(getByTestId('is-active').textContent).toBe('false')
      expect(getByTestId('is-loading').textContent).toBe('false')
    })
  })
})
