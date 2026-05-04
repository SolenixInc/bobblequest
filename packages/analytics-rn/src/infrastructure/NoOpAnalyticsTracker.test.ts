import { describe, expect, it } from 'vitest'
import { NoOpAnalyticsTracker } from './NoOpAnalyticsTracker'

describe('NoOpAnalyticsTracker', () => {
  const tracker = new NoOpAnalyticsTracker()

  it('capture returns undefined', () => {
    expect(tracker.capture('event', 'user-1', { key: 'val' })).toBeUndefined()
  })

  it('captureException returns undefined', () => {
    expect(tracker.captureException(new Error('e'), 'user-1')).toBeUndefined()
  })

  it('identify returns undefined', () => {
    expect(tracker.identify('user-1', { name: 'Alice' })).toBeUndefined()
  })

  it('alias returns undefined', () => {
    expect(tracker.alias('user-1', 'anon-1')).toBeUndefined()
  })

  it('group returns undefined', () => {
    expect(tracker.group('org', 'org-1')).toBeUndefined()
  })

  it('sessionId returns stable string', () => {
    expect(tracker.sessionId()).toBe('no-op-session-id')
  })

  it('isFeatureEnabled resolves false', async () => {
    await expect(tracker.isFeatureEnabled('flag', 'user-1')).resolves.toBe(false)
  })

  it('getAllFlags resolves to empty object', async () => {
    await expect(tracker.getAllFlags('user-1')).resolves.toEqual({})
  })

  it('captureRevenue returns undefined', () => {
    expect(tracker.captureRevenue({ distinctId: 'u', amount: 10, currency: 'USD' })).toBeUndefined()
  })

  it('captureLlm returns undefined', () => {
    expect(
      tracker.captureLlm({
        traceId: 't',
        model: 'gpt-4',
        inputTokens: 1,
        outputTokens: 1,
        latencyMs: 10,
      }),
    ).toBeUndefined()
  })

  it('captureScreen returns undefined', () => {
    expect(tracker.captureScreen('Home')).toBeUndefined()
  })

  it('shutdown resolves', async () => {
    await expect(tracker.shutdown()).resolves.toBeUndefined()
  })
})
