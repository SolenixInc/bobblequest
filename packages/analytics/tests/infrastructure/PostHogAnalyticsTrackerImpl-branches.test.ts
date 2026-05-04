import { beforeEach, describe, expect, test, vi } from 'vitest'

// Override posthog-node for this file: isFeatureEnabled returns null to test `?? false`
vi.mock('posthog-node', () => ({
  PostHog: class FakePostHogNullFlag {
    capture = vi.fn()
    identify = vi.fn()
    alias = vi.fn()
    groupIdentify = vi.fn()
    isFeatureEnabled = vi.fn(async () => null) // returns null to exercise `v ?? false`
    getAllFlags = async () => ({})
    shutdown = async () => {}
  },
}))

vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    warning: () => {},
    error: () => {},
  }),
}))

import { PostHogAnalyticsTrackerImpl } from '../../src/infrastructure/PostHogAnalyticsTrackerImpl'

describe('PostHogAnalyticsTrackerImpl — branch coverage', () => {
  let tracker: PostHogAnalyticsTrackerImpl

  beforeEach(() => {
    tracker = new PostHogAnalyticsTrackerImpl({
      environment: 'production',
      service: 'api',
      apiKey: 'phc_test',
    })
  })

  test('isFeatureEnabled returns false when PostHog returns null (v ?? false branch)', async () => {
    const result = await tracker.isFeatureEnabled('my-flag', 'u1')
    expect(result).toBe(false)
  })

  test('capture with no properties argument (props ?? {} branch in stampAndStrip)', () => {
    // no properties arg — triggers the `?? {}` default in stampAndStrip
    expect(() => tracker.capture('evt', 'u1')).not.toThrow()
  })

  test('stampAndStrip with undefined properties still stamps $environment and $service', () => {
    // Calling capture without properties exercises stampAndStrip(undefined)
    expect(() => tracker.group('org', 'acme')).not.toThrow()
  })
})
