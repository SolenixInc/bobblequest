import type { ConfigRepository } from '@t/config'
import { createContainer, dependencyKeys } from '@t/dependency-injection'
import { describe, expect, test } from 'vitest'
import { registerAnalyticsDI } from '../../src/dependency-injection/registerAnalyticsDI'
import { NoOpAnalyticsTracker } from '../../src/infrastructure/NoOpAnalyticsTracker'
import { PostHogAnalyticsTrackerImpl } from '../../src/infrastructure/PostHogAnalyticsTrackerImpl'

type AnalyticsSlice = ConfigRepository['analytics']

function fakeConfig(analytics: Partial<AnalyticsSlice>): ConfigRepository {
  return {
    analytics: {
      apiKey: '',
      personalApiKey: undefined,
      host: undefined,
      enabled: true,
      ...analytics,
    },
  } as unknown as ConfigRepository
}

describe('registerAnalyticsDI branch selection', () => {
  test('environment=testing -> NoOp (even with valid apiKey + enabled)', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({ apiKey: 'phc_xxx', enabled: true }),
      environment: 'testing',
      service: 'api',
    })
    const tracker = container.resolve(dependencyKeys.global.ANALYTICS)
    expect(tracker).toBeInstanceOf(NoOpAnalyticsTracker)
  })

  test('enabled=false -> NoOp (even with valid apiKey)', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({ apiKey: 'phc_xxx', enabled: false }),
      environment: 'production',
      service: 'api',
    })
    expect(container.resolve(dependencyKeys.global.ANALYTICS)).toBeInstanceOf(NoOpAnalyticsTracker)
  })

  test('missing apiKey (empty string) -> throws (hard-fail, no silent fallback)', () => {
    const container = createContainer()
    expect(() =>
      registerAnalyticsDI(container, {
        config: fakeConfig({ apiKey: '', enabled: true }),
        environment: 'production',
        service: 'api',
      }),
    ).toThrow('POSTHOG_API_KEY is required but was not set')
  })

  test('missing apiKey (undefined) -> throws (hard-fail, no silent fallback)', () => {
    const container = createContainer()
    expect(() =>
      registerAnalyticsDI(container, {
        config: fakeConfig({
          apiKey: undefined as unknown as string,
          enabled: true,
        }),
        environment: 'production',
        service: 'api',
      }),
    ).toThrow('POSTHOG_API_KEY is required but was not set')
  })

  test('happy path -> PostHogAnalyticsTrackerImpl', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({
        apiKey: 'phc_xxx',
        enabled: true,
        host: 'https://us.i.posthog.com',
      }),
      environment: 'production',
      service: 'api',
    })
    const tracker = container.resolve(dependencyKeys.global.ANALYTICS)
    expect(tracker).toBeInstanceOf(PostHogAnalyticsTrackerImpl)
    expect(tracker).not.toBeInstanceOf(NoOpAnalyticsTracker)
  })

  test('global tracker is singleton (same instance across resolves)', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({ apiKey: 'phc_xxx', enabled: true }),
      environment: 'production',
      service: 'api',
    })
    const a = container.resolve(dependencyKeys.global.ANALYTICS)
    const b = container.resolve(dependencyKeys.global.ANALYTICS)
    expect(a).toBe(b)
  })
})

describe('registerAnalyticsDI request-scoped registration', () => {
  test('REQUEST_ANALYTICS key is registered on the container', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({ apiKey: 'phc_xxx', enabled: true }),
      environment: 'production',
      service: 'api',
    })
    expect(Object.keys(container.registrations)).toContain(dependencyKeys.request.REQUEST_ANALYTICS)
  })

  test('REQUEST_ANALYTICS resolution from root without cradle deps throws', () => {
    const container = createContainer()
    registerAnalyticsDI(container, {
      config: fakeConfig({ apiKey: 'phc_xxx', enabled: true }),
      environment: 'production',
      service: 'api',
    })
    expect(() => container.resolve(dependencyKeys.request.REQUEST_ANALYTICS)).toThrow()
  })
})
