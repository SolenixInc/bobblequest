import { describe, expect, test } from 'vitest'
import { NoOpAnalyticsTracker } from '../../src/infrastructure/NoOpAnalyticsTracker'

describe('NoOpAnalyticsTracker behavior', () => {
  const mk = () => new NoOpAnalyticsTracker({ environment: 'testing', service: 'api' })

  test('capture does not throw (various arg shapes)', () => {
    const tracker = mk()
    expect(() => tracker.capture('evt', 'u1')).not.toThrow()
    expect(() => tracker.capture('evt', 'u1', { x: 1 })).not.toThrow()
    expect(() => tracker.capture('evt', 'u1', { x: 1 }, { org: 'a' })).not.toThrow()
  })

  test('captureException does not throw', () => {
    const tracker = mk()
    expect(() => tracker.captureException(new Error('boom'), 'u1')).not.toThrow()
    expect(() => tracker.captureException(new Error('boom'), 'u1', { k: 1 })).not.toThrow()
  })

  test('captureRevenue does not throw', () => {
    const tracker = mk()
    expect(() =>
      tracker.captureRevenue({ amount: 1, currency: 'USD', distinctId: 'u1' }),
    ).not.toThrow()
  })

  test('captureLlm does not throw', () => {
    const tracker = mk()
    expect(() =>
      tracker.captureLlm({
        model: 'gpt-4',
        inputTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        traceId: 't1',
      }),
    ).not.toThrow()
  })

  test('identify does not throw (with and without traits)', () => {
    const tracker = mk()
    expect(() => tracker.identify('u1')).not.toThrow()
    expect(() => tracker.identify('u1', { plan: 'pro' })).not.toThrow()
  })

  test('alias does not throw', () => {
    const tracker = mk()
    expect(() => tracker.alias('u1', 'u1-alias')).not.toThrow()
  })

  test('group does not throw (with and without traits)', () => {
    const tracker = mk()
    expect(() => tracker.group('organization', 'acme')).not.toThrow()
    expect(() => tracker.group('organization', 'acme', { tier: 'enterprise' })).not.toThrow()
  })

  test('sessionId returns literal "noop-session"', () => {
    expect(mk().sessionId()).toBe('noop-session')
  })

  test('isFeatureEnabled resolves to false', async () => {
    await expect(mk().isFeatureEnabled('some-flag', 'u1')).resolves.toBe(false)
  })

  test('getAllFlags resolves to empty object', async () => {
    await expect(mk().getAllFlags('u1')).resolves.toEqual({})
  })

  test('shutdown resolves', async () => {
    await expect(mk().shutdown()).resolves.toBeUndefined()
  })

  test('captureScreen does not throw (with and without properties)', () => {
    const tracker = mk()
    expect(() => tracker.captureScreen('HomeScreen')).not.toThrow()
    expect(() => tracker.captureScreen('ProfileScreen', { source: 'nav' })).not.toThrow()
  })
})
