import { afterEach, describe, expect, test } from 'vitest'
import { PostHogAnalyticsTrackerImpl } from '../../src/infrastructure/PostHogAnalyticsTrackerImpl'
import { capturedPostHogCalls } from '../setup/stubLogging'

/**
 * Structural type for PostHog capture/identify/alias payloads
 * used to verify outbound data without 'as any'.
 */
interface PostHogPayload {
  event?: string
  distinctId?: string
  properties: Record<string, unknown>
  groups?: Record<string, string>
}

afterEach(() => {
  capturedPostHogCalls.length = 0
})

describe('reserved prop stamping — PostHogAnalyticsTrackerImpl', () => {
  // ── helpers ──────────────────────────────────────────────────────────────

  function makeTracker() {
    return new PostHogAnalyticsTrackerImpl({
      environment: 'production',
      service: 'api',
      apiKey: 'phc_test',
    })
  }

  function getPayload(index = 0): PostHogPayload {
    return capturedPostHogCalls[index].args[0] as PostHogPayload
  }

  // ── 1. capture: $environment override dropped ─────────────────────────

  test('capture: caller $environment override is dropped, ctor value wins', () => {
    const tracker = makeTracker()
    tracker.capture('evt', 'u1', { $environment: 'attacker-staging', foo: 'bar' })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.event).toBe('evt')
    expect(payload.properties.$environment).toBe('production')
    expect(payload.properties.foo).toBe('bar')
  })

  // ── 2. capture: $service override dropped ────────────────────────────

  test('capture: caller $service override is dropped, ctor value wins', () => {
    const tracker = makeTracker()
    tracker.capture('evt', 'u1', { $service: 'attacker' })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.properties.$service).toBe('api')
  })

  // ── 3. caller-supplied reserved keys are stripped ─────────────────────

  test('capture: caller-supplied $session_id, distinct_id, request_id, $group are stripped', () => {
    const tracker = makeTracker()
    tracker.capture('evt', 'u1', {
      $session_id: 'evil-session',
      distinct_id: 'evil-distinct',
      request_id: 'evil-request',
      $group: 'evil-group',
    })
    expect(capturedPostHogCalls).toHaveLength(1)
    const props = getPayload().properties
    expect(props.$session_id).toBeUndefined()
    expect(props.distinct_id).toBeUndefined()
    expect(props.request_id).toBeUndefined()
    expect(props.$group).toBeUndefined()
  })

  // ── 4. non-reserved caller props pass through ─────────────────────────

  test('capture: non-reserved caller props pass through unchanged', () => {
    const tracker = makeTracker()
    tracker.capture('evt', 'u1', { foo: 'bar', count: 42 })
    expect(capturedPostHogCalls).toHaveLength(1)
    const props = getPayload().properties
    expect(props.foo).toBe('bar')
    expect(props.count).toBe(42)
  })

  // ── 5. captureException strips $service, adds exception fields ────────

  test('captureException: outbound $service = ctor value; exception fields present; caller $service dropped', () => {
    const tracker = makeTracker()
    const err = new Error('boom')
    tracker.captureException(err, 'u1', { $service: 'attacker' })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.event).toBe('$exception')
    expect(payload.properties.$service).toBe('api')
    expect(payload.properties.$exception_message).toBe('boom')
    expect(payload.properties.$exception_type).toBe('Error')
    expect(typeof payload.properties.$exception_stack).toBe('string')
  })

  // ── 6. captureRevenue strips $environment from meta ───────────────────

  test('captureRevenue: $revenue event; amount+currency present; ctor $environment wins over meta attacker', () => {
    const tracker = makeTracker()
    tracker.captureRevenue({
      amount: 42,
      currency: 'USD',
      distinctId: 'u1',
      meta: { $environment: 'attacker' },
    })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.event).toBe('$revenue')
    expect(payload.properties.amount).toBe(42)
    expect(payload.properties.currency).toBe('USD')
    expect(payload.properties.$environment).toBe('production')
  })

  // ── 7. captureLlm strips $service from meta ───────────────────────────

  test('captureLlm: $ai_generation event; $ai_model set; ctor $service wins over meta attacker', () => {
    const tracker = makeTracker()
    tracker.captureLlm({
      model: 'gpt-4',
      inputTokens: 10,
      outputTokens: 5,
      latencyMs: 100,
      traceId: 't1',
      meta: { $service: 'attacker' },
    })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.event).toBe('$ai_generation')
    expect(payload.properties.$ai_model).toBe('gpt-4')
    expect(payload.properties.$service).toBe('api')
  })

  // ── 8. identify strips $environment from traits ───────────────────────

  test('identify: outbound identify call has ctor $environment; caller $environment dropped', () => {
    const tracker = makeTracker()
    tracker.identify('u1', { $environment: 'attacker', name: 'Alice' })
    expect(capturedPostHogCalls).toHaveLength(1)
    const call = capturedPostHogCalls[0]
    expect(call.method).toBe('identify')
    const payload = getPayload()
    expect(payload.properties.$environment).toBe('production')
    expect(payload.properties.name).toBe('Alice')
  })

  // ── 9. sessionId returns a stable UUID ───────────────────────────────

  test('sessionId: returns a string, same value on repeat calls', () => {
    const tracker = makeTracker()
    const id1 = tracker.sessionId()
    const id2 = tracker.sessionId()
    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThan(0)
    expect(id1).toBe(id2)
  })

  // ── 10. isFeatureEnabled delegates to PostHog client ─────────────────

  test('isFeatureEnabled: resolves to false (mock returns false)', async () => {
    const tracker = makeTracker()
    await expect(tracker.isFeatureEnabled('my-flag', 'u1')).resolves.toBe(false)
  })

  // ── 11. getAllFlags delegates to PostHog client ───────────────────────

  test('getAllFlags: resolves to empty object (mock returns {})', async () => {
    const tracker = makeTracker()
    await expect(tracker.getAllFlags('u1')).resolves.toEqual({})
  })

  // ── 12. shutdown delegates to PostHog client ─────────────────────────

  test('shutdown: resolves without throwing', async () => {
    const tracker = makeTracker()
    await expect(tracker.shutdown()).resolves.toBeUndefined()
  })

  // ── 13-pre. stampAndStrip with undefined props (props ?? {} branch) ─────

  test('capture: no props argument still stamps $environment and $service', () => {
    const tracker = makeTracker()
    tracker.capture('evt', 'u1')
    expect(capturedPostHogCalls).toHaveLength(1)
    const props = getPayload().properties
    expect(props.$environment).toBe('production')
    expect(props.$service).toBe('api')
  })

  // ── 13-pre2. isFeatureEnabled returns false when PostHog returns null ────

  test('isFeatureEnabled: resolves to false when PostHog client returns null', async () => {
    const tracker = makeTracker()
    // Use prototype access or string index to bypass private for testing
    // without using 'any'.
    const client = tracker['postHogClient' as keyof typeof tracker] as unknown as {
      isFeatureEnabled: (...a: unknown[]) => Promise<unknown>
    }
    client.isFeatureEnabled = async () => null
    await expect(tracker.isFeatureEnabled('flag', 'u1')).resolves.toBe(false)
  })

  // ── 13. disabled tracker skips all side-effects ──────────────────────

  test('all methods: disabled tracker (enabled=false) makes no PostHog calls', () => {
    const tracker = new PostHogAnalyticsTrackerImpl({
      environment: 'production',
      service: 'api',
      apiKey: 'phc_test',
      enabled: false,
    })
    tracker.capture('evt', 'u1')
    tracker.captureException(new Error('e'), 'u1')
    tracker.captureRevenue({ amount: 1, currency: 'USD', distinctId: 'u1' })
    tracker.captureLlm({
      model: 'gpt-4',
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      traceId: 't1',
    })
    tracker.identify('u1')
    tracker.alias('u1', 'u2')
    tracker.group('org', 'acme')
    expect(capturedPostHogCalls).toHaveLength(0)
  })

  // ── 14. alias delegates to PostHog client ────────────────────────────

  test('alias: outbound alias call is recorded', () => {
    const tracker = makeTracker()
    tracker.alias('old-id', 'new-id')
    expect(capturedPostHogCalls).toHaveLength(1)
    expect(capturedPostHogCalls[0].method).toBe('alias')
  })

  // ── 15. group delegates to PostHog client ────────────────────────────

  test('group: outbound groupIdentify call is recorded', () => {
    const tracker = makeTracker()
    tracker.group('organization', 'acme', { tier: 'enterprise' })
    expect(capturedPostHogCalls).toHaveLength(1)
    expect(capturedPostHogCalls[0].method).toBe('groupIdentify')
  })

  // ── 16. captureScreen enabled path ───────────────────────────────────

  test('captureScreen: enabled tracker emits $screen event with stamped props', () => {
    const tracker = makeTracker()
    tracker.captureScreen('HomeScreen', { source: 'nav' })
    expect(capturedPostHogCalls).toHaveLength(1)
    const payload = getPayload()
    expect(payload.event).toBe('$screen')
    expect(payload.properties.$screen_name).toBe('HomeScreen')
    expect(payload.properties.$environment).toBe('production')
    expect(payload.properties.$service).toBe('api')
    expect(payload.properties.source).toBe('nav')
  })

  // ── 17. captureScreen disabled path ──────────────────────────────────

  test('captureScreen: disabled tracker (enabled=false) makes no PostHog calls', () => {
    const tracker = new PostHogAnalyticsTrackerImpl({
      environment: 'production',
      service: 'api',
      apiKey: 'phc_test',
      enabled: false,
    })
    tracker.captureScreen('HomeScreen')
    expect(capturedPostHogCalls).toHaveLength(0)
  })

  // ── 18. captureScreen no-props path ──────────────────────────────────

  test('captureScreen: no props still stamps $environment, $service, and $screen_name', () => {
    const tracker = makeTracker()
    tracker.captureScreen('ProfileScreen')
    expect(capturedPostHogCalls).toHaveLength(1)
    const props = getPayload().properties
    expect(props.$screen_name).toBe('ProfileScreen')
    expect(props.$environment).toBe('production')
    expect(props.$service).toBe('api')
  })
})
