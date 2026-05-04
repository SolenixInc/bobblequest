import type { ConfigRepository } from '@t/config'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('posthog-js', () => ({
  default: { init: vi.fn() },
}))

const mockGetAnalytics = vi.fn()
const mockInitAnalytics = vi.fn()

vi.mock('../../src/infrastructure/init', () => ({
  initAnalytics: mockInitAnalytics,
  getAnalytics: mockGetAnalytics,
}))

// Minimal ConfigRepository mock with property shape matching the port
const createMockConfig = (): ConfigRepository =>
  ({
    system: { environment: 'testing' },
    analytics: {
      apiKey: 'test-key',
      host: 'https://test.posthog.com',
      enabled: true,
    },
  }) as unknown as ConfigRepository

describe('AnalyticsProvider', () => {
  const mockTracker = {
    capture: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    sessionId: vi.fn(() => 'test-session-id'),
    isFeatureEnabled: vi.fn(() => Promise.resolve(false)),
    getAllFlags: vi.fn(() => Promise.resolve({})),
    shutdown: vi.fn(() => Promise.resolve()),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
    mockGetAnalytics.mockReturnValue(mockTracker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should render children once analytics is initialized', async () => {
    const { AnalyticsProvider } = await import('../../src/react/AnalyticsProvider')

    await act(async () => {
      render(
        <AnalyticsProvider config={createMockConfig()}>
          <div>test content</div>
        </AnalyticsProvider>,
      )
    })

    expect(screen.getByText('test content')).toBeDefined()
    expect(mockInitAnalytics).toHaveBeenCalledWith(createMockConfig())
  })

  it('should provide analytics tracker via useAnalytics hook', async () => {
    const { AnalyticsProvider, useAnalytics } = await import('../../src/react/AnalyticsProvider')

    function TestComponent() {
      const analytics = useAnalytics()
      return (
        <button type="button" onClick={() => analytics.capture('test-event', 'user-1')}>
          Click me
        </button>
      )
    }

    await act(async () => {
      render(
        <AnalyticsProvider config={createMockConfig()}>
          <TestComponent />
        </AnalyticsProvider>,
      )
    })

    const button = screen.getByRole('button', { name: 'Click me' })
    await act(async () => {
      button.click()
    })

    expect(mockTracker.capture).toHaveBeenCalledWith('test-event', 'user-1')
  })

  it('should handle initAnalytics error gracefully and still render children', async () => {
    mockInitAnalytics.mockImplementation(() => {
      throw new Error('init failed')
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { AnalyticsProvider } = await import('../../src/react/AnalyticsProvider')

    await act(async () => {
      render(
        <AnalyticsProvider config={createMockConfig()}>
          <div>error content</div>
        </AnalyticsProvider>,
      )
    })

    expect(screen.getByText('error content')).toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith('Failed to initialize analytics:', expect.any(Error))
    warnSpy.mockRestore()
  })

  it('should throw when useAnalytics is used outside AnalyticsProvider', async () => {
    const { useAnalytics } = await import('../../src/react/AnalyticsProvider')

    function TestComponent() {
      useAnalytics()
      return <div>should not render</div>
    }

    expect(() => render(<TestComponent />)).toThrow(
      'useAnalytics must be used within an AnalyticsProvider',
    )
  })
})
