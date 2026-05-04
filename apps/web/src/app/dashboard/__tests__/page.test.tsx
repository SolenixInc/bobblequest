/**
 * Tests for apps/web/src/app/dashboard/page.tsx
 *
 * Pattern: async server component — `const ui = await Page(); render(ui);`
 *
 * Three render paths:
 *   (a) isClerkConfigured() === false  → unconfigured banner
 *   (b) configured + userId null       → redirectToSignIn() called (throws sentinel)
 *   (c) configured + userId present    → renders DashboardSubscriptionStatus
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before dynamic imports of the subject under test
// ---------------------------------------------------------------------------

// 1. server-only — Vitest runs in Node, not Next.js server context
vi.mock('server-only', () => ({}))

// 2. @/lib/server/auth — control isClerkConfigured() return value per test
vi.mock('@/lib/server/auth', () => ({
  isClerkConfigured: vi.fn(),
}))

// 3. @clerk/nextjs/server — control auth() return value per test
//    auth() returns { userId, redirectToSignIn }
//    redirectToSignIn() in the real Clerk SDK throws a NEXT_REDIRECT;
//    we model that by having our sentinel throw so the SUT behaviour is correct.
const REDIRECT_SENTINEL = new Error('CLERK_REDIRECT_TO_SIGN_IN')

const mockRedirectToSignIn = vi.fn(() => {
  throw REDIRECT_SENTINEL
})

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

// 4. DashboardSubscriptionStatus — sentinel; covered by its own test suite
vi.mock('../_components/DashboardSubscriptionStatus.js', () => ({
  DashboardSubscriptionStatus: () => <div data-testid="dashboard-subscription-status-sentinel" />,
}))

// ---------------------------------------------------------------------------
// Import SUT + mocked modules after vi.mock hoisting
// ---------------------------------------------------------------------------

import { isClerkConfigured } from '@/lib/server/auth'
import DashboardPage from '../page.js'

const mockIsClerkConfigured = vi.mocked(isClerkConfigured)

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// (a) Clerk NOT configured → unconfigured banner
// ---------------------------------------------------------------------------

describe('Clerk not configured', () => {
  test('renders the unconfigured banner when isClerkConfigured returns false', async () => {
    mockIsClerkConfigured.mockReturnValue(false)

    const ui = await DashboardPage()
    render(ui)

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText(/Auth is disabled/)).toBeDefined()
    expect(screen.getByText(/CLERK_SECRET_KEY/)).toBeDefined()
  })

  test('does NOT render DashboardSubscriptionStatus when not configured', async () => {
    mockIsClerkConfigured.mockReturnValue(false)

    const ui = await DashboardPage()
    render(ui)

    expect(screen.queryByTestId('dashboard-subscription-status-sentinel')).toBeNull()
  })

  test('auth() is never called when Clerk is not configured', async () => {
    mockIsClerkConfigured.mockReturnValue(false)

    await DashboardPage()

    expect(mockAuth).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// (b) Configured + userId null → redirectToSignIn()
// ---------------------------------------------------------------------------

describe('Clerk configured, userId null', () => {
  test('calls redirectToSignIn and throws the redirect sentinel', async () => {
    mockIsClerkConfigured.mockReturnValue(true)
    mockAuth.mockResolvedValue({
      userId: null,
      redirectToSignIn: mockRedirectToSignIn,
    })

    await expect(DashboardPage()).rejects.toThrow(REDIRECT_SENTINEL)
    expect(mockRedirectToSignIn).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// (c) Configured + userId present → renders DashboardSubscriptionStatus
// ---------------------------------------------------------------------------

describe('Clerk configured, userId present', () => {
  test('renders the Dashboard heading', async () => {
    mockIsClerkConfigured.mockReturnValue(true)
    mockAuth.mockResolvedValue({
      userId: 'user_abc123',
      redirectToSignIn: mockRedirectToSignIn,
    })

    const ui = await DashboardPage()
    render(ui)

    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  test('renders the DashboardSubscriptionStatus sentinel', async () => {
    mockIsClerkConfigured.mockReturnValue(true)
    mockAuth.mockResolvedValue({
      userId: 'user_abc123',
      redirectToSignIn: mockRedirectToSignIn,
    })

    const ui = await DashboardPage()
    render(ui)

    expect(screen.getByTestId('dashboard-subscription-status-sentinel')).toBeDefined()
  })

  test('redirectToSignIn is NOT called when userId is present', async () => {
    mockIsClerkConfigured.mockReturnValue(true)
    mockAuth.mockResolvedValue({
      userId: 'user_abc123',
      redirectToSignIn: mockRedirectToSignIn,
    })

    await DashboardPage()

    expect(mockRedirectToSignIn).not.toHaveBeenCalled()
  })
})
