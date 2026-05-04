import type { AnalyticsTrackerOptions } from '@t/analytics-types'
import { describe, expect, test } from 'vitest'
import { NoOpAnalyticsTracker } from '../../src/infrastructure/NoOpAnalyticsTracker'
import { PostHogAnalyticsTrackerImpl } from '../../src/infrastructure/PostHogAnalyticsTrackerImpl'

describe('PostHogAnalyticsTrackerImpl construction guards', () => {
  test('throws TypeError "environment required" when environment is missing', () => {
    expect(() => new PostHogAnalyticsTrackerImpl({} as unknown as AnalyticsTrackerOptions)).toThrow(
      TypeError,
    )
    expect(() => new PostHogAnalyticsTrackerImpl({} as unknown as AnalyticsTrackerOptions)).toThrow(
      'environment required',
    )
  })

  test('throws TypeError "service required" when service is missing', () => {
    expect(
      () =>
        new PostHogAnalyticsTrackerImpl({
          environment: 'production',
        } as unknown as AnalyticsTrackerOptions),
    ).toThrow(TypeError)
    expect(
      () =>
        new PostHogAnalyticsTrackerImpl({
          environment: 'production',
        } as unknown as AnalyticsTrackerOptions),
    ).toThrow('service required')
  })

  test('constructs successfully with environment and service', () => {
    expect(
      () =>
        new PostHogAnalyticsTrackerImpl({
          environment: 'production',
          service: 'api',
        } as unknown as AnalyticsTrackerOptions),
    ).not.toThrow()
  })
})

describe('NoOpAnalyticsTracker construction guards', () => {
  test('throws TypeError "environment required" when environment is missing', () => {
    expect(() => new NoOpAnalyticsTracker({} as unknown as AnalyticsTrackerOptions)).toThrow(
      TypeError,
    )
    expect(() => new NoOpAnalyticsTracker({} as unknown as AnalyticsTrackerOptions)).toThrow(
      'environment required',
    )
  })

  test('throws TypeError "service required" when service is missing', () => {
    expect(
      () =>
        new NoOpAnalyticsTracker({
          environment: 'production',
        } as unknown as AnalyticsTrackerOptions),
    ).toThrow(TypeError)
    expect(
      () =>
        new NoOpAnalyticsTracker({
          environment: 'production',
        } as unknown as AnalyticsTrackerOptions),
    ).toThrow('service required')
  })

  test('constructs successfully with environment and service', () => {
    expect(
      () =>
        new NoOpAnalyticsTracker({
          environment: 'production',
          service: 'api',
        } as unknown as AnalyticsTrackerOptions),
    ).not.toThrow()
  })
})
