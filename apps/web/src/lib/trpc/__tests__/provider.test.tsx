/**
 * Regression test for trpc/provider.tsx
 *
 * Guards against the "useAuth can only be used within the <ClerkProvider />"
 * crash that occurred when CLERK_SECRET_KEY is absent (no-Clerk dev mode).
 *
 * Covers:
 *  - No-Clerk path: TrpcProvider renders without calling useAuth()
 *  - Clerk-configured path: TrpcProvider delegates to AuthedTrpcProvider
 *  - PostHog header injection: both branches (session+distinct id present / absent)
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// ------------------------------------------------------------------
// vi.hoisted — values created here are available inside vi.mock() factories
// ------------------------------------------------------------------
const { mockUseAuth, clientConfigState, posthogState } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({ getToken: vi.fn().mockResolvedValue(null) }))
  const clientConfigState = { clerkPublishableKey: undefined as string | undefined }
  const posthogState = {
    sessionId: null as string | null,
    distinctId: null as string | null,
  }
  return { mockUseAuth, clientConfigState, posthogState }
})

// ------------------------------------------------------------------
// Module mocks
// ------------------------------------------------------------------

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class MockQueryClient {},
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}))

// httpBatchLink is mocked to capture the headers() function so tests can
// invoke it directly and assert on the returned header map.
vi.mock('@trpc/client', () => ({
  httpBatchLink: vi.fn(({ headers }: { headers: () => Promise<Record<string, string>> }) => ({
    type: 'httpBatchLink',
    _headers: headers,
  })),
}))

vi.mock('posthog-js', () => ({
  default: {
    get_session_id: () => posthogState.sessionId,
    get_distinct_id: () => posthogState.distinctId,
  },
}))

vi.mock('../client.js', () => ({
  trpc: {
    createClient: vi.fn((config) => ({ type: 'mock-trpc-client', _config: config })),
    Provider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="trpc-provider">{children}</div>
    ),
  },
}))

vi.mock('@/lib/clientConfig', () => ({
  get webClientConfig() {
    return {
      clerk: { publishableKey: clientConfigState.clerkPublishableKey },
      trpc: { url: 'http://localhost:3000/trpc' },
      posthog: { key: undefined, host: 'https://us.i.posthog.com' },
      revenueCat: { publicApiKey: undefined },
      environment: 'development',
    }
  },
}))

// ------------------------------------------------------------------
// Subject under test
// ------------------------------------------------------------------
import { httpBatchLink } from '@trpc/client'
import { TrpcProvider } from '../provider.js'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Extracts the headers() function that was passed into the most-recently
 * constructed httpBatchLink during the render that just occurred.
 */
function captureHeadersFn(): (() => Promise<Record<string, string>>) | undefined {
  const mockHttpBatchLink = vi.mocked(httpBatchLink)
  const lastCall = mockHttpBatchLink.mock.calls.at(-1)
  if (!lastCall) return undefined
  const arg = lastCall[0] as { headers?: () => Promise<Record<string, string>> }
  return arg.headers
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  posthogState.sessionId = null
  posthogState.distinctId = null
})

describe('TrpcProvider — no Clerk configured', () => {
  beforeEach(() => {
    clientConfigState.clerkPublishableKey = undefined
  })

  test('renders children without calling useAuth', () => {
    render(
      <TrpcProvider>
        <span>trpc content</span>
      </TrpcProvider>,
    )

    expect(screen.getByText('trpc content')).toBeDefined()
    // Critical: useAuth must NOT be called — throws outside ClerkProvider
    expect(mockUseAuth).not.toHaveBeenCalled()
  })

  test('renders tRPC and QueryClient providers', () => {
    render(
      <TrpcProvider>
        <span>content</span>
      </TrpcProvider>,
    )

    expect(screen.getByTestId('trpc-provider')).toBeDefined()
    expect(screen.getByTestId('query-client-provider')).toBeDefined()
  })

  // ----------------------------------------------------------------
  // PostHog headers — anonymous (no-Clerk) path
  // ----------------------------------------------------------------
  test('anon path: includes PostHog headers when session+distinct ids are present', async () => {
    posthogState.sessionId = 'ses_abc123'
    posthogState.distinctId = 'usr_xyz789'

    render(
      <TrpcProvider>
        <span>content</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    const headers = await headersFn!()

    expect(headers['x-posthog-session-id']).toBe('ses_abc123')
    expect(headers['x-posthog-distinct-id']).toBe('usr_xyz789')
  })

  test('anon path: omits PostHog headers when ids are null', async () => {
    posthogState.sessionId = null
    posthogState.distinctId = null

    render(
      <TrpcProvider>
        <span>content</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    // Must not throw and must not include the posthog keys
    const headers = await headersFn!()

    expect('x-posthog-session-id' in headers).toBe(false)
    expect('x-posthog-distinct-id' in headers).toBe(false)
  })
})

describe('TrpcProvider — Clerk configured', () => {
  beforeEach(() => {
    clientConfigState.clerkPublishableKey = 'pk_test_placeholder_replace_me'
  })

  test('renders children via AuthedTrpcProvider', () => {
    render(
      <TrpcProvider>
        <span>authed trpc</span>
      </TrpcProvider>,
    )

    expect(screen.getByText('authed trpc')).toBeDefined()
    expect(screen.getByTestId('trpc-provider')).toBeDefined()
  })

  test('calls useAuth in the Clerk-configured path', () => {
    render(
      <TrpcProvider>
        <span>authed</span>
      </TrpcProvider>,
    )

    expect(mockUseAuth).toHaveBeenCalled()
  })

  // ----------------------------------------------------------------
  // PostHog headers — authenticated (Clerk) path
  // ----------------------------------------------------------------
  test('authed path: includes PostHog headers when session+distinct ids are present', async () => {
    posthogState.sessionId = 'ses_authed123'
    posthogState.distinctId = 'usr_authed456'

    render(
      <TrpcProvider>
        <span>authed</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    const headers = await headersFn!()

    expect(headers['x-posthog-session-id']).toBe('ses_authed123')
    expect(headers['x-posthog-distinct-id']).toBe('usr_authed456')
  })

  test('authed path: omits PostHog headers when ids are null and does not throw', async () => {
    posthogState.sessionId = null
    posthogState.distinctId = null

    render(
      <TrpcProvider>
        <span>authed</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    const headers = await headersFn!()

    expect('x-posthog-session-id' in headers).toBe(false)
    expect('x-posthog-distinct-id' in headers).toBe(false)
  })

  test('authed path: attaches Bearer token when getToken returns a value', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('clerk-jwt-token')
    mockUseAuth.mockReturnValue({ getToken: mockGetToken })

    render(
      <TrpcProvider>
        <span>authed</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    const headers = await headersFn!()

    expect(headers.authorization).toBe('Bearer clerk-jwt-token')
  })

  test('authed path: no authorization header when getToken returns null', async () => {
    const mockGetToken = vi.fn().mockResolvedValue(null)
    mockUseAuth.mockReturnValue({ getToken: mockGetToken })

    render(
      <TrpcProvider>
        <span>authed</span>
      </TrpcProvider>,
    )

    const headersFn = captureHeadersFn()
    expect(headersFn).toBeDefined()
    const headers = await headersFn!()

    expect('authorization' in headers).toBe(false)
  })
})
