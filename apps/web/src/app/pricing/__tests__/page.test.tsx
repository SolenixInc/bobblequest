import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mutable state so vi.mock factories can close over refs that tests
// mutate between runs.
//
// useBillingClient() returns the raw tracker from useBilling() UNLESS the
// tracker has shape { client: null } — that sentinel is the "not configured"
// signal.  All other return values are returned as-is as the billing client,
// so mock shapes must match what PricingPage expects on the client itself.
// ---------------------------------------------------------------------------
const { mockUseBilling, mockUseEntitlement } = vi.hoisted(() => {
  // Default: { client: null } → useBillingClient returns null → not configured
  const mockUseBilling = vi.fn(() => ({ client: null }) as Record<string, unknown>)
  const mockUseEntitlement = vi.fn(() => ({
    isActive: false,
    isLoading: false,
    expirationDate: null as string | null,
  }))
  return { mockUseBilling, mockUseEntitlement }
})

// ---------------------------------------------------------------------------
// Mock @t/billing-browser before importing the page component.
// ---------------------------------------------------------------------------
vi.mock('@t/billing-browser', () => ({
  useBilling: () => mockUseBilling(),
  useEntitlement: () => mockUseEntitlement(),
}))

// Import AFTER mocks are registered.
import PricingPage from '../page'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PricingPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    // Default: not configured — useBillingClient will return null
    mockUseBilling.mockReturnValue({ client: null })
    mockUseEntitlement.mockReturnValue({
      isActive: false,
      isLoading: false,
      expirationDate: null,
    })
  })

  // -------------------------------------------------------------------------
  // Branch 1: no billing client (not configured)
  // -------------------------------------------------------------------------
  it('renders the pricing-not-configured state when client is null', () => {
    render(<PricingPage />)

    const banner = screen.getByTestId('pricing-not-configured')
    expect(banner).toBeDefined()
    expect(banner.textContent).toContain('Pricing unavailable')
    expect(banner.textContent).toContain('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY')
  })

  it('smoke render — mounts without throwing', () => {
    expect(() => render(<PricingPage />)).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // Branch 2: client present, loading state
  // The component initialises isLoading=true when client is non-null.
  // Provide a tracker with a never-resolving getOfferings to hold that state.
  // useBillingClient returns the tracker directly (no { client: ... } wrapper).
  // -------------------------------------------------------------------------
  it('renders the loading state while offerings are being fetched', () => {
    // Return a tracker that IS the client — has getOfferings at the top level
    mockUseBilling.mockReturnValue({
      getOfferings: () => new Promise(() => {}),
    })

    render(<PricingPage />)

    // Loading spinner uses aria-label
    expect(screen.getByLabelText('Loading pricing')).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Branch 3: client present, offerings fetch throws an Error
  // -------------------------------------------------------------------------
  it('renders the error state when getOfferings throws', async () => {
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockRejectedValue(new Error('Network failure')),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('pricing-error')).toBeDefined()
    })
    expect(screen.getByTestId('pricing-error').textContent).toContain('Network failure')
  })

  // -------------------------------------------------------------------------
  // Branch 3b: error is not an Error instance (unknown throw shape)
  // -------------------------------------------------------------------------
  it('renders the error state with fallback message for non-Error throws', async () => {
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockRejectedValue('string error'),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('pricing-error')).toBeDefined()
    })
    expect(screen.getByTestId('pricing-error').textContent).toContain(
      'Unknown error loading offerings.',
    )
  })

  // -------------------------------------------------------------------------
  // Branch 4: client present but no offerings API (no getOfferings / purchases)
  // -------------------------------------------------------------------------
  it('renders error state when offerings API is not available on tracker', async () => {
    // Tracker has no purchases / _purchases / getOfferings at top level
    mockUseBilling.mockReturnValue({ someOtherProp: true })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('pricing-error')).toBeDefined()
    })
    expect(screen.getByTestId('pricing-error').textContent).toContain('Offerings API not available')
  })

  // -------------------------------------------------------------------------
  // Branch 5: client present, offerings loaded, empty packages list
  // -------------------------------------------------------------------------
  it('renders "No plans are available" when packages list is empty', async () => {
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockResolvedValue({
        current: { identifier: 'default', availablePackages: [] },
      }),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('No plans are available at this time.')).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Branch 5b: offerings.current is null
  // -------------------------------------------------------------------------
  it('renders "No plans are available" when current offering is null', async () => {
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockResolvedValue({ current: null }),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('No plans are available at this time.')).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Branch 6: packages loaded, renders PackageCards — via _purchases path
  // -------------------------------------------------------------------------
  it('renders package cards when offerings are loaded', async () => {
    const mockOfferings = {
      current: {
        identifier: 'default',
        availablePackages: [
          {
            identifier: 'monthly',
            webBillingProduct: {
              title: 'Monthly Plan',
              price: { formattedPrice: '$9.99/mo' },
              productType: 'subscription',
            },
          },
          {
            identifier: 'annual',
            webBillingProduct: {
              title: 'Annual Plan',
              price: { formattedPrice: '$99.99/yr' },
              productType: 'subscription',
            },
          },
        ],
      },
    }

    // Exercise the _purchases fallback lookup path
    mockUseBilling.mockReturnValue({
      _purchases: { getOfferings: vi.fn().mockResolvedValue(mockOfferings) },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Monthly Plan')).toBeDefined()
    })
    expect(screen.getByText('Annual Plan')).toBeDefined()
    expect(screen.getByText('$9.99/mo')).toBeDefined()
    expect(screen.getByText('$99.99/yr')).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Branch 7: premium banner renders when isPremium is true
  // -------------------------------------------------------------------------
  it('renders the premium banner when the user has an active premium entitlement', () => {
    mockUseEntitlement.mockReturnValue({
      isActive: true,
      isLoading: false,
      expirationDate: '2027-01-01',
    })

    render(<PricingPage />)

    expect(screen.getByTestId('premium-banner')).toBeDefined()
    expect(screen.getByTestId('premium-banner').textContent).toContain("You're a member")
  })

  it('does not render the premium banner when the user has no premium entitlement', () => {
    render(<PricingPage />)
    expect(screen.queryByTestId('premium-banner')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // Branch 8: getOfferings via client.purchases (primary path)
  // -------------------------------------------------------------------------
  it('resolves offerings via client.purchases when present', async () => {
    mockUseBilling.mockReturnValue({
      purchases: {
        getOfferings: vi.fn().mockResolvedValue({
          current: {
            identifier: 'default',
            availablePackages: [
              {
                identifier: 'pro',
                webBillingProduct: {
                  title: 'Pro Plan',
                  price: { formattedPrice: '$19.99/mo' },
                  productType: 'SUBSCRIPTION',
                },
              },
            ],
          },
        }),
      },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Pro Plan')).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Branch 9: getOfferings via client.getOfferings (adapter pattern)
  // -------------------------------------------------------------------------
  it('resolves offerings via client.getOfferings when adapter pattern is used', async () => {
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockResolvedValue({
        current: {
          identifier: 'default',
          availablePackages: [
            {
              identifier: 'basic',
              webBillingProduct: {
                title: 'Basic Plan',
                price: { formattedPrice: '$4.99/mo' },
                productType: 'SUBSCRIPTION',
              },
            },
          ],
        },
      }),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Basic Plan')).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Branch 10: useBilling() throws → useBillingClient catch returns null
  // -------------------------------------------------------------------------
  it('renders not-configured banner when useBilling throws', () => {
    mockUseBilling.mockImplementation(() => {
      throw new Error('BillingProvider missing')
    })

    render(<PricingPage />)

    expect(screen.getByTestId('pricing-not-configured')).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Branch 11: handleSubscribe — clicking Subscribe triggers the handler.
  // Covers lines 177-201 (handleSubscribe body).
  // -------------------------------------------------------------------------
  it('calls presentPaywall when Subscribe is clicked and purchases path is available', async () => {
    const mockPresentPaywall = vi.fn().mockResolvedValue(undefined)

    mockUseBilling.mockReturnValue({
      purchases: {
        getOfferings: vi.fn().mockResolvedValue({
          current: {
            identifier: 'default',
            availablePackages: [
              {
                identifier: 'monthly',
                webBillingProduct: {
                  title: 'Click Plan',
                  price: { formattedPrice: '$5.00/mo' },
                  productType: 'subscription',
                },
              },
            ],
          },
        }),
        presentPaywall: mockPresentPaywall,
      },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Click Plan')).toBeDefined()
    })

    const subscribeBtn = screen.getByRole('button', { name: 'Subscribe' })
    subscribeBtn.click()

    await waitFor(() => {
      expect(mockPresentPaywall).toHaveBeenCalled()
    })
  })

  it('handleSubscribe is a no-op when no presentPaywall is found (purchases path)', async () => {
    // Client has purchases but no presentPaywall
    mockUseBilling.mockReturnValue({
      purchases: {
        getOfferings: vi.fn().mockResolvedValue({
          current: {
            identifier: 'default',
            availablePackages: [
              {
                identifier: 'monthly',
                webBillingProduct: {
                  title: 'Plan NoPaywall',
                  price: { formattedPrice: '$3.00/mo' },
                  productType: 'subscription',
                },
              },
            ],
          },
        }),
        // no presentPaywall
      },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Plan NoPaywall')).toBeDefined()
    })

    // Clicking Subscribe should not throw (no-op path)
    expect(() => screen.getByRole('button', { name: 'Subscribe' }).click()).not.toThrow()
  })

  it('handleSubscribe is a no-op when no purchases/getSharedInstance found (null path)', async () => {
    // Client has getOfferings directly (adapter) but no purchases/_purchases/getSharedInstance.
    // In handleSubscribe, purchases resolves to null → the if-branch is skipped.
    mockUseBilling.mockReturnValue({
      getOfferings: vi.fn().mockResolvedValue({
        current: {
          identifier: 'default',
          availablePackages: [
            {
              identifier: 'null-path',
              webBillingProduct: {
                title: 'Null Path Plan',
                price: { formattedPrice: '$2.00/mo' },
                productType: 'subscription',
              },
            },
          ],
        },
      }),
      // No purchases, no _purchases, no getSharedInstance
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Null Path Plan')).toBeDefined()
    })

    // Clicking Subscribe hits the null branch in handleSubscribe — no throw
    expect(() => screen.getByRole('button', { name: 'Subscribe' }).click()).not.toThrow()
  })

  it('handleSubscribe via getSharedInstance path calls presentPaywall', async () => {
    const mockPresentPaywall = vi.fn().mockResolvedValue(undefined)

    mockUseBilling.mockReturnValue({
      getSharedInstance: vi.fn().mockReturnValue({
        presentPaywall: mockPresentPaywall,
      }),
      getOfferings: vi.fn().mockResolvedValue({
        current: {
          identifier: 'default',
          availablePackages: [
            {
              identifier: 'shared',
              webBillingProduct: {
                title: 'Shared Plan',
                price: { formattedPrice: '$7.00/mo' },
                productType: 'subscription',
              },
            },
          ],
        },
      }),
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Shared Plan')).toBeDefined()
    })

    screen.getByRole('button', { name: 'Subscribe' }).click()

    await waitFor(() => {
      expect(mockPresentPaywall).toHaveBeenCalled()
    })
  })

  it('handleSubscribe catches and logs errors from presentPaywall', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockPresentPaywall = vi.fn().mockRejectedValue(new Error('Paywall error'))

    mockUseBilling.mockReturnValue({
      purchases: {
        getOfferings: vi.fn().mockResolvedValue({
          current: {
            identifier: 'default',
            availablePackages: [
              {
                identifier: 'error-plan',
                webBillingProduct: {
                  title: 'Error Plan',
                  price: { formattedPrice: '$1.00/mo' },
                  productType: 'subscription',
                },
              },
            ],
          },
        }),
        presentPaywall: mockPresentPaywall,
      },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Error Plan')).toBeDefined()
    })

    screen.getByRole('button', { name: 'Subscribe' }).click()

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to present paywall:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })
})
