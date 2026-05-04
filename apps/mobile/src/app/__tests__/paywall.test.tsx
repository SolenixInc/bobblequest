/**
 * Tests for the PaywallScreen component.
 *
 * All native/Expo dependencies are mocked — no native runtime required.
 */
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBack = vi.fn()

vi.mock('expo-router', () => ({
  useRouter: vi.fn(() => ({ back: mockBack })),
}))

vi.mock('react-native-purchases-ui', () => ({
  default: {
    Paywall: ({ onDismiss }: { onDismiss: () => void }) => (
      <button type="button" data-testid="paywall-dismiss" onClick={onDismiss}>
        dismiss
      </button>
    ),
  },
}))

// react-native is already aliased to the mock file via vitest.config.ts, but
// explicitly mock here for test isolation.
vi.mock('react-native', () => ({
  StyleSheet: { create: (s: unknown) => s },
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import type * as React from 'react'

describe('PaywallScreen', () => {
  it('renders the paywall without crashing', async () => {
    const { default: PaywallScreen } = await import('../paywall')

    let container!: HTMLElement
    await act(async () => {
      const result = render(<PaywallScreen />)
      container = result.container
    })

    expect(container.querySelector('[data-testid="paywall-dismiss"]')).not.toBeNull()
  })

  it('calls router.back() when the paywall is dismissed', async () => {
    const { default: PaywallScreen } = await import('../paywall')

    let getByTestId!: (id: string) => HTMLElement
    await act(async () => {
      const result = render(<PaywallScreen />)
      getByTestId = result.getByTestId as unknown as (id: string) => HTMLElement
    })

    const dismissBtn = getByTestId('paywall-dismiss')
    await act(async () => {
      dismissBtn.click()
    })

    expect(mockBack).toHaveBeenCalledOnce()
  })
})
