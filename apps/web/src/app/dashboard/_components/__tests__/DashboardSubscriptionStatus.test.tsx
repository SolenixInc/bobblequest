import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DashboardSubscriptionStatus } from '../DashboardSubscriptionStatus.js'

// Mock the entire @t/billing-browser module so we never touch the real SDK
vi.mock('@t/billing-browser', () => ({
  useEntitlement: vi.fn(),
}))

import { useEntitlement } from '@t/billing-browser'

const mockUseEntitlement = vi.mocked(useEntitlement)

afterEach(() => {
  cleanup()
})

describe('DashboardSubscriptionStatus', () => {
  test('renders dashboard-subscription-card testid', () => {
    mockUseEntitlement.mockReturnValue({
      isActive: false,
      expirationDate: null,
      isLoading: false,
    })

    render(<DashboardSubscriptionStatus />)

    expect(screen.getByTestId('dashboard-subscription-card')).toBeDefined()
  })

  describe('active entitlement', () => {
    test('renders "Active" badge', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: true,
        expirationDate: '2025-12-31',
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.getByText('Active')).toBeDefined()
    })

    test('renders the entitlement id label', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: true,
        expirationDate: '2025-12-31',
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      // The component hard-codes "Pro" as the entitlement display name
      const ddElements = screen.getAllByText('Pro')
      expect(ddElements.length).toBeGreaterThanOrEqual(1)
    })

    test('renders expiration date when active', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: true,
        expirationDate: '2025-12-31',
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.getByText('2025-12-31')).toBeDefined()
    })

    test('does not render "Active" badge while loading', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: true,
        expirationDate: null,
        isLoading: true,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.queryByText('Active')).toBeNull()
    })
  })

  describe('inactive entitlement', () => {
    test('renders "Inactive" badge', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: false,
        expirationDate: null,
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.getByText('Inactive')).toBeDefined()
    })

    test('renders em-dash placeholder when inactive and no expiration', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: false,
        expirationDate: null,
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      // Component renders "—" when isActive is false or expirationDate is absent
      expect(screen.getByText('—')).toBeDefined()
    })

    test('does not render "Inactive" badge while loading', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: false,
        expirationDate: null,
        isLoading: true,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.queryByText('Inactive')).toBeNull()
    })
  })

  describe('loading state', () => {
    test('renders "Loading…" badge while fetching', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: false,
        expirationDate: null,
        isLoading: true,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.getByText('Loading…')).toBeDefined()
    })

    test('does not render "Loading…" badge once resolved', () => {
      mockUseEntitlement.mockReturnValue({
        isActive: false,
        expirationDate: null,
        isLoading: false,
      })

      render(<DashboardSubscriptionStatus />)

      expect(screen.queryByText('Loading…')).toBeNull()
    })
  })

  test('useEntitlement is called with "pro" entitlement id', () => {
    mockUseEntitlement.mockReturnValue({
      isActive: false,
      expirationDate: null,
      isLoading: false,
    })

    render(<DashboardSubscriptionStatus />)

    expect(mockUseEntitlement).toHaveBeenCalledWith('pro')
  })
})
