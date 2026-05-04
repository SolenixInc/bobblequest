import { createContainer } from '@t/dependency-injection'
import type { Container } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAnalyticsBrowserDI } from '../../src/dependency-injection/registerAnalyticsBrowserDI'

// Mock posthog-js to avoid real network calls during instantiation tests
const mockPosthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  alias: vi.fn(),
  group: vi.fn(),
  isFeatureEnabled: vi.fn(() => false),
  featureFlags: { getFlagVariants: vi.fn(() => ({})) },
  captureException: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('posthog-js', () => ({ default: mockPosthog }))

// Minimal mock container — register is a spy so we can inspect calls
const createMockContainer = (): Container => {
  const registerSpy = vi.fn()
  return {
    register: registerSpy,
    resolve: vi.fn(),
  } as unknown as Container
}

// Minimal BrowserConfigAccessor mock
const createMockConfig = (overrides: Record<string, string | undefined> = {}) => {
  const base: Record<string, string | undefined> = {
    NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://test.posthog.com',
  }
  return {
    // Use `key in overrides` to distinguish "key explicitly set to undefined" from "key absent"
    get: (key: string): string | undefined => (key in overrides ? overrides[key] : base[key]),
  }
}

describe('registerAnalyticsBrowserDI', () => {
  let container: Container

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
    container = createMockContainer()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call container.register once', () => {
    const config = createMockConfig()
    registerAnalyticsBrowserDI(container, { config })
    expect(container.register).toHaveBeenCalledOnce()
  })

  it('should register under dependencyKeys.global.ANALYTICS (canonical key)', () => {
    const config = createMockConfig()
    registerAnalyticsBrowserDI(container, { config })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).toHaveProperty(dependencyKeys.global.ANALYTICS)
  })

  it('should NOT register under the old string key "analyticsTracker"', () => {
    const config = createMockConfig()
    registerAnalyticsBrowserDI(container, { config })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).not.toHaveProperty('analyticsTracker')
  })

  it('should register under canonical key when noOp is true', () => {
    const config = createMockConfig()
    registerAnalyticsBrowserDI(container, { config, noOp: true })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).toHaveProperty(dependencyKeys.global.ANALYTICS)
  })

  it('should register under canonical key when PostHog key is missing', () => {
    // Suppress the expected console.warn in this code path
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = createMockConfig({ NEXT_PUBLIC_POSTHOG_KEY: undefined })
    registerAnalyticsBrowserDI(container, { config })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).toHaveProperty(dependencyKeys.global.ANALYTICS)
    warnSpy.mockRestore()
  })

  it('should register under canonical key when window is undefined (SSR)', () => {
    vi.unstubAllGlobals()
    const config = createMockConfig()
    registerAnalyticsBrowserDI(container, { config })
    const [registrations] = (container.register as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(registrations).toHaveProperty(dependencyKeys.global.ANALYTICS)
  })

  it('should accept pii options without error', () => {
    const config = createMockConfig()
    expect(() =>
      registerAnalyticsBrowserDI(container, {
        config,
        pii: { extraKeys: ['mySecret'], replaceWith: '***' },
      }),
    ).not.toThrow()
    expect(container.register).toHaveBeenCalledOnce()
  })

  it('resolves PostHogBrowserAnalyticsTracker when key is present (instantiates constructor)', () => {
    // Use a real Awilix container to exercise the PostHogBrowserBound constructor
    const realContainer = createContainer()
    const config = createMockConfig()
    registerAnalyticsBrowserDI(realContainer, { config })
    const tracker = realContainer.resolve(dependencyKeys.global.ANALYTICS)
    expect(tracker).toBeDefined()
    expect(mockPosthog.init).toHaveBeenCalled()
  })

  it('resolves NoOpAnalyticsTracker via real container when key is missing', () => {
    const realContainer = createContainer()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = createMockConfig({ NEXT_PUBLIC_POSTHOG_KEY: undefined })
    registerAnalyticsBrowserDI(realContainer, { config })
    const tracker = realContainer.resolve(dependencyKeys.global.ANALYTICS)
    expect(tracker).toBeDefined()
    warnSpy.mockRestore()
  })

  it('resolves ServerNoOp via real container when window is undefined (SSR)', () => {
    vi.unstubAllGlobals()
    const realContainer = createContainer()
    const config = createMockConfig()
    registerAnalyticsBrowserDI(realContainer, { config })
    const tracker = realContainer.resolve(dependencyKeys.global.ANALYTICS)
    expect(tracker).toBeDefined()
  })
})
