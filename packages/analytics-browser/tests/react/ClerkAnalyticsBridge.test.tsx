import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(),
  useOrganization: vi.fn().mockReturnValue({ organization: null, isLoaded: false }),
}))

vi.mock('../../src/react/useIdentify', () => ({
  useIdentify: vi.fn(),
}))

vi.mock('../../src/react/AnalyticsProvider', () => ({
  useAnalytics: vi.fn().mockReturnValue({ group: vi.fn() }),
}))

describe('ClerkAnalyticsBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call useIdentify with user id and traits when user is loaded and signed in', async () => {
    const { useUser, useAuth } = await import('@clerk/nextjs')
    const { useIdentify } = await import('../../src/react/useIdentify')
    const { default: ClerkAnalyticsBridge } = await import('../../src/react/ClerkAnalyticsBridge')

    vi.mocked(useUser).mockReturnValue({
      user: {
        id: 'user_123',
        primaryEmailAddress: { emailAddress: 'test@example.com' },
        firstName: 'Test',
        lastName: 'User',
      },
      isLoaded: true,
    } as never)

    vi.mocked(useAuth).mockReturnValue({
      sessionId: 'session_123',
      isSignedIn: true,
    } as never)

    render(<ClerkAnalyticsBridge />)

    expect(useIdentify).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }),
    )
  })

  it('should call useIdentify with undefined when user is not loaded', async () => {
    const { useUser, useAuth } = await import('@clerk/nextjs')
    const { useIdentify } = await import('../../src/react/useIdentify')
    const { default: ClerkAnalyticsBridge } = await import('../../src/react/ClerkAnalyticsBridge')

    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoaded: false,
    } as never)

    vi.mocked(useAuth).mockReturnValue({
      sessionId: undefined,
      isSignedIn: false,
    } as never)

    render(<ClerkAnalyticsBridge />)

    // ClerkAnalyticsBridge always calls useIdentify — with undefined when not loaded
    expect(useIdentify).toHaveBeenCalledWith(undefined, undefined)
  })

  it('should call analytics.group when organization is loaded and present', async () => {
    const { useUser, useAuth, useOrganization } = await import('@clerk/nextjs')
    const { useAnalytics } = await import('../../src/react/AnalyticsProvider')
    const { default: ClerkAnalyticsBridge } = await import('../../src/react/ClerkAnalyticsBridge')

    vi.mocked(useUser).mockReturnValue({
      user: { id: 'user_123', primaryEmailAddress: null, firstName: 'Test', lastName: 'User' },
      isLoaded: true,
    } as never)

    vi.mocked(useAuth).mockReturnValue({ isSignedIn: true } as never)

    const mockGroup = vi.fn()
    vi.mocked(useAnalytics).mockReturnValue({ group: mockGroup } as never)

    vi.mocked(useOrganization).mockReturnValue({
      organization: { id: 'org_abc', name: 'Acme Corp', slug: 'acme-corp' },
      isLoaded: true,
    } as never)

    render(<ClerkAnalyticsBridge />)

    expect(mockGroup).toHaveBeenCalledWith('organization', 'org_abc', {
      name: 'Acme Corp',
      slug: 'acme-corp',
    })
  })

  it('should not throw when rendering with a loaded user', async () => {
    const { useUser, useAuth } = await import('@clerk/nextjs')
    const { default: ClerkAnalyticsBridge } = await import('../../src/react/ClerkAnalyticsBridge')

    vi.mocked(useUser).mockReturnValue({
      user: {
        id: 'user_123',
        primaryEmailAddress: { emailAddress: 'test@example.com' },
        firstName: 'Test',
        lastName: 'User',
      },
      isLoaded: true,
    } as never)

    vi.mocked(useAuth).mockReturnValue({
      sessionId: 'session_123',
      isSignedIn: true,
    } as never)

    expect(() => render(<ClerkAnalyticsBridge />)).not.toThrow()
  })
})
