/**
 * Tests for apps/web/src/app/layout.tsx
 *
 * Covers:
 *  - isClerkConfiguredClient() returns true  → RootLayout wraps inner tree in ClerkProvider
 *  - isClerkConfiguredClient() returns false → RootLayout renders inner tree WITHOUT ClerkProvider
 *  - metadata export is present with expected title/description
 *  - logger.info and logger.warning calls
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// vi.hoisted — all refs used inside vi.mock() factories must be created here
// ---------------------------------------------------------------------------
const { mockIsClerkConfiguredClient, mockLoggerInfo, mockLoggerWarning } = vi.hoisted(() => {
  const mockIsClerkConfiguredClient = vi.fn(() => false)
  const mockLoggerInfo = vi.fn()
  const mockLoggerWarning = vi.fn()
  return { mockIsClerkConfiguredClient, mockLoggerInfo, mockLoggerWarning }
})

// ---------------------------------------------------------------------------
// Module mocks — hoisted by Vitest before all imports
// ---------------------------------------------------------------------------

// Stub 'server-only' so Vitest (Node context) doesn't throw
vi.mock('server-only', () => ({}))

vi.mock('@/lib/server/auth', () => ({
  isClerkConfiguredClient: () => mockIsClerkConfiguredClient(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warning: (...args: unknown[]) => mockLoggerWarning(...args),
  },
}))

vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
}))

vi.mock('@/app/providers/analytics-provider', () => ({
  AppAnalyticsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="analytics-provider">{children}</div>
  ),
}))

vi.mock('@/app/providers/billing-provider', () => ({
  AppBillingProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="billing-provider">{children}</div>
  ),
}))

vi.mock('@/lib/trpc/provider', () => ({
  TrpcProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="trpc-provider">{children}</div>
  ),
}))

vi.mock('@/app/_components/posthog-page-view', () => ({
  PostHogPageView: () => <div data-testid="posthog-page-view" />,
}))

// Stub Suspense to render children synchronously in jsdom
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    Suspense: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// ---------------------------------------------------------------------------
// Subject under test — imported AFTER all mocks are registered
// ---------------------------------------------------------------------------
import RootLayout, { metadata } from '../layout.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// metadata export
// ---------------------------------------------------------------------------

describe('metadata export', () => {
  test('has expected title', () => {
    expect(metadata.title).toBe('Template Web App')
  })

  test('has expected description', () => {
    expect(metadata.description).toBe('Authenticated product UI')
  })
})

// ---------------------------------------------------------------------------
// RootLayout — Clerk NOT configured
// ---------------------------------------------------------------------------

describe('RootLayout — Clerk not configured', () => {
  test('renders children without ClerkProvider', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span data-testid="child">hello</span>
      </RootLayout>,
    )

    expect(screen.getByTestId('child')).toBeDefined()
    expect(screen.queryByTestId('clerk-provider')).toBeNull()
  })

  test('renders the analytics provider', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(screen.getByTestId('analytics-provider')).toBeDefined()
  })

  test('renders the trpc provider', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(screen.getByTestId('trpc-provider')).toBeDefined()
  })

  test('renders the billing provider', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(screen.getByTestId('billing-provider')).toBeDefined()
  })

  test('calls logger.warning when Clerk is not configured', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(mockLoggerWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
      }),
    )
  })

  test('calls logger.info on boot', () => {
    mockIsClerkConfiguredClient.mockReturnValue(false)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(mockLoggerInfo).toHaveBeenCalledWith(expect.objectContaining({ message: 'web boot' }))
  })
})

// ---------------------------------------------------------------------------
// RootLayout — Clerk IS configured
// ---------------------------------------------------------------------------

describe('RootLayout — Clerk configured', () => {
  test('wraps inner tree in ClerkProvider', () => {
    mockIsClerkConfiguredClient.mockReturnValue(true)

    // jsdom strips nested <html>/<body> elements when rendered inside a container
    // div, so we use `container` to locate the clerk-provider sentinel.
    const { container } = render(
      <RootLayout>
        <span data-testid="child">hello</span>
      </RootLayout>,
    )

    // The ClerkProvider mock renders as <div data-testid="clerk-provider">
    expect(container.querySelector('[data-testid="clerk-provider"]')).not.toBeNull()
  })

  test('does NOT call logger.warning when Clerk is configured', () => {
    mockIsClerkConfiguredClient.mockReturnValue(true)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(mockLoggerWarning).not.toHaveBeenCalled()
  })

  test('calls logger.info on boot in Clerk-configured path', () => {
    mockIsClerkConfiguredClient.mockReturnValue(true)

    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    )

    expect(mockLoggerInfo).toHaveBeenCalledWith(expect.objectContaining({ message: 'web boot' }))
  })
})
