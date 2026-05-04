/**
 * Tests for ClerkAnalyticsBridge.
 *
 * Coverage targets:
 *   - Lines 20-22: the `if (user)` branch — posthog.identify called with
 *     user.id and primary email address when a signed-in user is present.
 *   - The `else` branch (posthog.reset) is exercised by the existing
 *     providers.test.tsx suite through TrpcProvider rendering, but we also
 *     cover it explicitly here for isolated branch clarity.
 *
 * Strategy:
 *   - vi.mock('@clerk/clerk-react') — control what useUser() returns.
 *   - vi.mock('posthog-js') — spy on identify() and reset().
 *   - @testing-library/react render() — drives the useEffect hook.
 *   - vi.resetModules() + dynamic import between describe blocks so each
 *     test group gets a fresh module evaluation with its own useUser stub.
 */
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockIdentify = vi.fn()
const mockReset = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    identify: mockIdentify,
    reset: mockReset,
    init: vi.fn(),
    get_session_id: vi.fn(),
    get_distinct_id: vi.fn(),
  },
}))

// We keep a mutable reference so individual tests can override useUser return.
let mockUseUserReturn: { user: object | null; isLoaded: boolean } = {
  user: null,
  isLoaded: true,
}

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUseUserReturn,
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClerkAnalyticsBridge — user signed IN (identify branch, lines 20-22)', () => {
  const fakeUser = {
    id: 'user_abc123',
    primaryEmailAddress: { emailAddress: 'alice@example.com' },
  }

  beforeEach(() => {
    vi.resetModules()
    mockIdentify.mockClear()
    mockReset.mockClear()
    mockUseUserReturn = { user: fakeUser, isLoaded: true }
  })

  it('calls posthog.identify with user.id when a signed-in user is present', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    expect(mockIdentify).toHaveBeenCalledTimes(1)
    expect(mockIdentify).toHaveBeenCalledWith(fakeUser.id, {
      email: fakeUser.primaryEmailAddress.emailAddress,
    })
  })

  it('does NOT call posthog.reset when a user is signed in', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    expect(mockReset).not.toHaveBeenCalled()
  })

  it('passes primaryEmailAddress.emailAddress as the email property', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    const [, traits] = mockIdentify.mock.calls[0] as [string, { email: string }]
    expect(traits.email).toBe('alice@example.com')
  })
})

describe('ClerkAnalyticsBridge — user signed OUT (reset branch)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIdentify.mockClear()
    mockReset.mockClear()
    mockUseUserReturn = { user: null, isLoaded: true }
  })

  it('calls posthog.reset when no user is present', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('does NOT call posthog.identify when no user is present', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    expect(mockIdentify).not.toHaveBeenCalled()
  })
})

describe('ClerkAnalyticsBridge — auth not yet loaded (early-return guard)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIdentify.mockClear()
    mockReset.mockClear()
    mockUseUserReturn = { user: null, isLoaded: false }
  })

  it('neither identifies nor resets when isLoaded is false', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    render(<ClerkAnalyticsBridge />)

    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockReset).not.toHaveBeenCalled()
  })
})

describe('ClerkAnalyticsBridge — renders null (no DOM output)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockUseUserReturn = { user: null, isLoaded: true }
  })

  it('returns null — mounts without inserting any DOM nodes', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    const { container } = render(<ClerkAnalyticsBridge />)

    expect(container.firstChild).toBeNull()
  })
})
