/**
 * Regression test for billing-provider.tsx
 *
 * Guards against the "useAuth can only be used within the <ClerkProvider />"
 * crash that occurred when CLERK_SECRET_KEY is absent (no-Clerk dev mode).
 *
 * Covers:
 *  - No-Clerk path: AppBillingProvider renders without calling useAuth()
 *  - Clerk-configured path: AppBillingProvider delegates to AuthedBillingProvider
 *    (which calls useAuth() inside a proper ClerkProvider)
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// ------------------------------------------------------------------
// vi.hoisted — values created here are available inside vi.mock() factories
// because vi.mock() is hoisted to run before all other module-level code.
// vi.hoisted() runs at the same hoist level, so refs are safe to close over.
// ------------------------------------------------------------------
const { mockUseAuth, clientConfigState } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({ userId: 'test-user-123' }))
  const clientConfigState = { clerkPublishableKey: undefined as string | undefined }
  return { mockUseAuth, clientConfigState }
})

// ------------------------------------------------------------------
// Module mocks
// ------------------------------------------------------------------

vi.mock('@t/billing-browser', () => ({
  BillingProvider: ({
    children,
    userId,
  }: {
    children: React.ReactNode
    userId: string | null | undefined
  }) => (
    <div data-testid="billing-provider" data-user-id={userId ?? 'null'}>
      {children}
    </div>
  ),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/lib/clientConfig', () => ({
  get webClientConfig() {
    return {
      clerk: { publishableKey: clientConfigState.clerkPublishableKey },
      revenueCat: { publicApiKey: undefined },
      environment: 'development',
    }
  },
}))

// ------------------------------------------------------------------
// Subject under test — imported AFTER mocks are registered
// ------------------------------------------------------------------
import { AppBillingProvider } from '../billing-provider.js'

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AppBillingProvider — no Clerk configured', () => {
  beforeEach(() => {
    clientConfigState.clerkPublishableKey = undefined
  })

  test('renders children inside BillingProvider without calling useAuth', () => {
    render(
      <AppBillingProvider>
        <span>hello</span>
      </AppBillingProvider>,
    )

    expect(screen.getByText('hello')).toBeDefined()
    expect(screen.getByTestId('billing-provider')).toBeDefined()
    // Critical: useAuth must NOT be called — it would throw outside ClerkProvider
    expect(mockUseAuth).not.toHaveBeenCalled()
  })

  test('passes null userId to BillingProvider when Clerk is absent', () => {
    render(
      <AppBillingProvider>
        <span>content</span>
      </AppBillingProvider>,
    )

    const provider = screen.getByTestId('billing-provider')
    expect(provider.getAttribute('data-user-id')).toBe('null')
  })
})

describe('AppBillingProvider — Clerk configured', () => {
  beforeEach(() => {
    clientConfigState.clerkPublishableKey = 'pk_test_placeholder_replace_me'
  })

  test('renders children inside BillingProvider via AuthedBillingProvider', () => {
    render(
      <AppBillingProvider>
        <span>authed content</span>
      </AppBillingProvider>,
    )

    expect(screen.getByText('authed content')).toBeDefined()
    expect(screen.getByTestId('billing-provider')).toBeDefined()
    // useAuth IS called in the Clerk-configured path
    expect(mockUseAuth).toHaveBeenCalled()
  })

  test('passes the Clerk userId to BillingProvider', () => {
    render(
      <AppBillingProvider>
        <span>authed</span>
      </AppBillingProvider>,
    )

    const provider = screen.getByTestId('billing-provider')
    expect(provider.getAttribute('data-user-id')).toBe('test-user-123')
  })
})
