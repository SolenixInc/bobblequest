/**
 * Tests for TrpcProvider.
 *
 * Since desktopClientConfig is imported at module level in providers.tsx,
 * tests that need different config values use vi.resetModules + dynamic import.
 *
 * We mock all external dependencies so the tests are hermetic.
 */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────
// These are safe to mock at file level because they're always the same stub.
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: Object.assign(
    ({
      children,
      publishableKey: _publishableKey,
    }: {
      children: React.ReactNode
      publishableKey?: string
    }) => children,
    { displayName: 'ClerkProvider' },
  ),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('fake-jwt') }),
  useUser: () => ({ user: null, isLoaded: true }),
}))

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../billing/DesktopBillingProvider', () => ({
  DesktopBillingProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../trpc', () => ({
  trpc: {
    createClient: vi.fn(() => ({})),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}))

// We'll provide a shared mutable config object. Each describe block mutates
// it in place so the live binding stays valid across re-imports.
const mockConfig: Record<string, unknown> = {}
function setMockConfig(next: Record<string, unknown>) {
  for (const k of Object.keys(mockConfig)) delete mockConfig[k]
  Object.assign(mockConfig, next)
}
vi.mock('../clientConfig', () => ({
  desktopClientConfig: mockConfig,
}))

// Mock the underlying posthog-js module for init spying
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    get_session_id: vi.fn().mockReturnValue('sess-abc'),
    get_distinct_id: vi.fn().mockReturnValue('distinct-xyz'),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}))

// ─── loggerLink / httpBatchLink mock ─────────────────────────────────────────
// Capture the options each factory receives so tests can introspect the
// callbacks (enabled, headers) without running real tRPC network logic.

type LoggerLinkOpts = { enabled: (opts: { direction: string; result: unknown }) => boolean }
type HttpBatchLinkOpts = { url: string; headers: () => Promise<Record<string, string>> }

let capturedLoggerOpts: LoggerLinkOpts | null = null
let capturedHttpOpts: HttpBatchLinkOpts | null = null

vi.mock('@trpc/client', () => ({
  loggerLink: vi.fn((opts: LoggerLinkOpts) => {
    capturedLoggerOpts = opts
    return { type: 'loggerLink' }
  }),
  httpBatchLink: vi.fn((opts: HttpBatchLinkOpts) => {
    capturedHttpOpts = opts
    return { type: 'httpBatchLink' }
  }),
}))

describe('TrpcProvider (default config - both keys present)', () => {
  beforeEach(() => {
    setMockConfig({
      posthog: { key: 'test-key', host: undefined },
      clerk: { publishableKey: 'pk_test_123' },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  it('renders children without throwing', async () => {
    const Children = () => <div data-testid="children">hello</div>
    const { TrpcProvider } = await import('../providers')
    render(
      <TrpcProvider>
        <Children />
      </TrpcProvider>,
    )
    expect(screen.getByTestId('children')).toHaveTextContent('hello')
  })

  it('initializes posthog when key is present', async () => {
    const { TrpcProvider } = await import('../providers')
    const { default: posthog } = await import('posthog-js')

    const Children = () => <div data-testid="children">hello</div>
    render(
      <TrpcProvider>
        <Children />
      </TrpcProvider>,
    )

    // host is undefined in this config → providers.tsx falls back to the
    // PostHog US cloud default.
    expect(posthog.init).toHaveBeenCalledWith('test-key', {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_performance: true,
      person_profiles: 'identified_only',
      session_recording: {},
    })
  })
})

describe('TrpcProvider (posthog key absent)', () => {
  beforeEach(() => {
    setMockConfig({
      posthog: { key: undefined, host: undefined },
      clerk: { publishableKey: 'pk_test_123' },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  it('does NOT initialize posthog when key is absent', async () => {
    const { TrpcProvider } = await import('../providers')
    const { default: posthog } = await import('posthog-js')

    const Children = () => <div data-testid="children">hello</div>
    render(
      <TrpcProvider>
        <Children />
      </TrpcProvider>,
    )

    expect(posthog.init).not.toHaveBeenCalled()
  })
})

describe('TrpcProvider (clerk key absent)', () => {
  beforeEach(() => {
    setMockConfig({
      posthog: { key: 'test-key', host: undefined },
      clerk: { publishableKey: undefined },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  it('still renders children without ClerkProvider when clerk key is absent', async () => {
    const { TrpcProvider } = await import('../providers')

    const Children = () => <div data-testid="children">hello</div>
    render(
      <TrpcProvider>
        <Children />
      </TrpcProvider>,
    )

    // Children still render (just bypasses ClerkProvider)
    expect(screen.getByTestId('children')).toHaveTextContent('hello')
  })
})

// ─── loggerLink enabled() callback (lines 19-21) ─────────────────────────────

describe('InnerTrpcProvider — loggerLink enabled() callback (lines 20-21)', () => {
  beforeEach(() => {
    capturedLoggerOpts = null
    setMockConfig({
      posthog: { key: 'test-key', host: undefined },
      clerk: { publishableKey: 'pk_test_123' },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  async function renderAndCaptureLoggerOpts() {
    const { TrpcProvider } = await import('../providers')
    render(
      <TrpcProvider>
        <div />
      </TrpcProvider>,
    )
    // capturedLoggerOpts is set synchronously during useState initializer
    return capturedLoggerOpts as LoggerLinkOpts
  }

  it('enabled returns true in development mode', async () => {
    // vi.stubEnv is the correct way to temporarily override NODE_ENV in vitest
    vi.stubEnv('NODE_ENV', 'development')
    const opts = await renderAndCaptureLoggerOpts()
    expect(opts).not.toBeNull()
    const result = opts!.enabled({ direction: 'up', result: undefined })
    vi.unstubAllEnvs()
    expect(result).toBe(true)
  })

  it('enabled returns true when direction is "down" and result is an Error', async () => {
    const opts = await renderAndCaptureLoggerOpts()
    expect(opts).not.toBeNull()
    const result = opts!.enabled({ direction: 'down', result: new Error('boom') })
    expect(result).toBe(true)
  })

  it('enabled returns false in non-development mode when result is not an Error (line 20-21 false branch)', async () => {
    // process.env.NODE_ENV is 'test' in vitest; opts.result is not an Error
    const opts = await renderAndCaptureLoggerOpts()
    expect(opts).not.toBeNull()
    const result = opts!.enabled({ direction: 'up', result: { data: 'ok' } })
    expect(result).toBe(false)
  })

  it('enabled returns false when direction is "down" but result is not an Error', async () => {
    const opts = await renderAndCaptureLoggerOpts()
    expect(opts).not.toBeNull()
    const result = opts!.enabled({ direction: 'down', result: { data: 'ok' } })
    expect(result).toBe(false)
  })
})

// ─── httpBatchLink headers() function (lines 26-38) ──────────────────────────

describe('InnerTrpcProvider — httpBatchLink headers() (lines 26-38)', () => {
  beforeEach(() => {
    capturedHttpOpts = null
    setMockConfig({
      posthog: { key: 'test-key', host: undefined },
      clerk: { publishableKey: 'pk_test_123' },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  async function renderAndCaptureHttpOpts() {
    const { TrpcProvider } = await import('../providers')
    render(
      <TrpcProvider>
        <div />
      </TrpcProvider>,
    )
    return capturedHttpOpts as HttpBatchLinkOpts
  }

  it('headers() includes Authorization when getToken returns a token', async () => {
    // The useAuth mock already returns getToken that resolves to 'fake-jwt'
    const opts = await renderAndCaptureHttpOpts()
    expect(opts).not.toBeNull()

    const headers = await opts!.headers()
    expect(headers.authorization).toBe('Bearer fake-jwt')
  })

  it('headers() includes x-posthog-session-id from posthog.get_session_id()', async () => {
    const opts = await renderAndCaptureHttpOpts()
    const headers = await opts!.headers()
    expect(headers['x-posthog-session-id']).toBe('sess-abc')
  })

  it('headers() includes x-posthog-distinct-id from posthog.get_distinct_id()', async () => {
    const opts = await renderAndCaptureHttpOpts()
    const headers = await opts!.headers()
    expect(headers['x-posthog-distinct-id']).toBe('distinct-xyz')
  })

  it('headers() omits Authorization when getToken returns null', async () => {
    // Re-mock clerk to return getToken that resolves to null (signed-out case)
    vi.doMock('@clerk/clerk-react', () => ({
      ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
      useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
      useUser: () => ({ user: null, isLoaded: true }),
    }))
    vi.resetModules()

    const opts = await renderAndCaptureHttpOpts()
    const headers = await opts!.headers()
    expect(headers.authorization).toBeUndefined()
  })

  it('headers() omits posthog headers when session/distinct ids are empty', async () => {
    // Override posthog get_session_id and get_distinct_id to return falsy
    vi.doMock('posthog-js', () => ({
      default: {
        init: vi.fn(),
        get_session_id: vi.fn().mockReturnValue(''),
        get_distinct_id: vi.fn().mockReturnValue(''),
        identify: vi.fn(),
        reset: vi.fn(),
      },
    }))
    vi.resetModules()

    const opts = await renderAndCaptureHttpOpts()
    const headers = await opts!.headers()
    expect(headers['x-posthog-session-id']).toBeUndefined()
    expect(headers['x-posthog-distinct-id']).toBeUndefined()
  })
})

// ─── posthog init with explicit host (line 58 true branch) ───────────────────

describe('TrpcProvider — posthog init with explicit host', () => {
  beforeEach(() => {
    setMockConfig({
      posthog: { key: 'test-key', host: 'https://eu.posthog.com' },
      clerk: { publishableKey: 'pk_test_123' },
      trpc: { url: 'http://localhost:3000/trpc' },
    })
    vi.resetModules()
  })

  it('uses explicit host when posthog.host is set', async () => {
    const { TrpcProvider } = await import('../providers')
    const { default: posthog } = await import('posthog-js')

    render(
      <TrpcProvider>
        <div />
      </TrpcProvider>,
    )

    expect(posthog.init).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({
        api_host: 'https://eu.posthog.com',
      }),
    )
  })
})
