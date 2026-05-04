import { beforeEach, describe, expect, it } from 'vitest'
import { AnalyticsTracker } from '../../src/entities/ports/AnalyticsTracker'
import type { LlmEvent } from '../../src/entities/types/LlmEvent'
import type { RevenueEvent } from '../../src/entities/types/RevenueEvent'
import { RequestAnalyticsTrackerImpl } from '../../src/infrastructure/RequestAnalyticsTrackerImpl'

// ---------------------------------------------------------------------------
// Fake parent
// ---------------------------------------------------------------------------

type Call = { method: string; args: unknown[] }

class FakeParent extends AnalyticsTracker {
  calls: Call[] = []

  capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void {
    this.calls.push({ method: 'capture', args: [event, distinctId, properties, groups] })
  }

  captureException(error: Error, distinctId: string, properties?: Record<string, unknown>): void {
    this.calls.push({ method: 'captureException', args: [error, distinctId, properties] })
  }

  captureRevenue(event: RevenueEvent): void {
    this.calls.push({ method: 'captureRevenue', args: [event] })
  }

  captureLlm(event: LlmEvent): void {
    this.calls.push({ method: 'captureLlm', args: [event] })
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    this.calls.push({ method: 'identify', args: [distinctId, traits] })
  }

  alias(distinctId: string, alias: string): void {
    this.calls.push({ method: 'alias', args: [distinctId, alias] })
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    this.calls.push({ method: 'group', args: [groupType, groupKey, traits] })
  }

  sessionId(): string {
    return 'parent-session'
  }

  async isFeatureEnabled(_key: string, _distinctId: string): Promise<boolean> {
    this.calls.push({ method: 'isFeatureEnabled', args: [_key, _distinctId] })
    return true
  }

  async getAllFlags(_distinctId: string): Promise<Record<string, boolean | string>> {
    this.calls.push({ method: 'getAllFlags', args: [_distinctId] })
    return { flagA: true }
  }

  async shutdown(): Promise<void> {
    this.calls.push({ method: 'shutdown', args: [] })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTracker(
  overrides: Partial<{
    userId: string
    sessionIdFromHeader: string
    requestId: string
    groupKey: string
  }>,
  parent: FakeParent,
): RequestAnalyticsTrackerImpl {
  return new RequestAnalyticsTrackerImpl({
    parent,
    requestId: overrides.requestId ?? 'r-1',
    userId: overrides.userId,
    sessionIdFromHeader: overrides.sessionIdFromHeader,
    groupKey: overrides.groupKey,
  })
}

function captureCall(parent: FakeParent): {
  event: string
  distinctId: string
  properties: Record<string, unknown>
} {
  const call = parent.calls.find((c) => c.method === 'capture')!
  const [event, distinctId, properties] = call.args as [string, string, Record<string, unknown>]
  return { event, distinctId, properties }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('request-scope stamping — RequestAnalyticsTrackerImpl', () => {
  let parent: FakeParent

  beforeEach(() => {
    parent = new FakeParent()
  })

  it('distinct_id fallback precedence: userId wins over sessionIdFromHeader and requestId', () => {
    const tracker = makeTracker(
      { userId: 'u-1', sessionIdFromHeader: 's-1', requestId: 'r-1' },
      parent,
    )
    tracker.capture('e', 'passthrough', { foo: 1 })
    const { properties } = captureCall(parent)
    expect(properties.distinct_id).toBe('u-1')
  })

  it('distinct_id fallback: no userId -> sessionIdFromHeader wins', () => {
    const tracker = makeTracker({ sessionIdFromHeader: 's-1', requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.distinct_id).toBe('s-1')
  })

  it('distinct_id fallback: no userId, no sessionIdFromHeader -> requestId', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.distinct_id).toBe('r-1')
  })

  it('$session_id === sessionIdFromHeader when present', () => {
    const tracker = makeTracker({ sessionIdFromHeader: 's-1', requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.$session_id).toBe('s-1')
  })

  it('$session_id === requestId when sessionIdFromHeader absent', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.$session_id).toBe('r-1')
  })

  it('request_id is stamped as the ctor requestId', () => {
    const tracker = makeTracker({ requestId: 'r-42' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.request_id).toBe('r-42')
  })

  it('$group stamped when groupKey provided', () => {
    const tracker = makeTracker({ groupKey: 'org-42', requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(properties.$group).toBe('org-42')
  })

  it('$group absent when no groupKey provided', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    tracker.capture('e', 'passthrough')
    const { properties } = captureCall(parent)
    expect(Object.hasOwn(properties, '$group')).toBe(false)
  })

  it('caller props pass through alongside stamped fields', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    tracker.capture('e', 'd', { foo: 'bar' })
    const { properties } = captureCall(parent)
    expect(properties.foo).toBe('bar')
    expect(properties.distinct_id).toBe('r-1')
  })

  it('captureRevenue stamps distinct_id, $session_id, request_id into meta', () => {
    const tracker = makeTracker(
      { userId: 'u1', sessionIdFromHeader: 's1', requestId: 'r1' },
      parent,
    )
    tracker.captureRevenue({ amount: 1, currency: 'USD', distinctId: 'u1', meta: { x: 1 } })

    const call = parent.calls.find((c) => c.method === 'captureRevenue')!
    const event = call.args[0] as RevenueEvent
    expect(event.meta?.distinct_id).toBe('u1')
    expect(event.meta?.$session_id).toBe('s1')
    expect(event.meta?.request_id).toBe('r1')
    expect(event.meta?.x).toBe(1)
  })

  it('captureLlm stamps distinct_id, $session_id, request_id into meta', () => {
    const tracker = makeTracker(
      { userId: 'u1', sessionIdFromHeader: 's1', requestId: 'r1' },
      parent,
    )
    tracker.captureLlm({
      model: 'gpt-4',
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 100,
      traceId: 't-1',
      meta: { y: 2 },
    })

    const call = parent.calls.find((c) => c.method === 'captureLlm')!
    const event = call.args[0] as LlmEvent
    expect(event.meta?.distinct_id).toBe('u1')
    expect(event.meta?.$session_id).toBe('s1')
    expect(event.meta?.request_id).toBe('r1')
    expect(event.meta?.y).toBe(2)
  })

  it('identify delegates with stamped traits merged with caller traits', () => {
    const tracker = makeTracker(
      { userId: 'u-x', sessionIdFromHeader: 's-x', requestId: 'r-x' },
      parent,
    )
    tracker.identify('u-x', { plan: 'pro' })

    const call = parent.calls.find((c) => c.method === 'identify')!
    const [distinctId, traits] = call.args as [string, Record<string, unknown>]
    expect(distinctId).toBe('u-x')
    expect(traits.plan).toBe('pro')
    expect(traits.distinct_id).toBe('u-x')
    expect(traits.$session_id).toBe('s-x')
    expect(traits.request_id).toBe('r-x')
  })

  it('sessionId() returns sessionIdFromHeader when present', () => {
    const tracker = makeTracker({ sessionIdFromHeader: 's-1', requestId: 'r-1' }, parent)
    expect(tracker.sessionId()).toBe('s-1')
  })

  it('sessionId() returns requestId when sessionIdFromHeader absent', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    expect(tracker.sessionId()).toBe('r-1')
  })

  it('alias forwards directly to parent', () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    tracker.alias('d-1', 'anon-1')
    const call = parent.calls.find((c) => c.method === 'alias')!
    expect(call.args).toEqual(['d-1', 'anon-1'])
  })

  it('isFeatureEnabled forwards to parent and returns its result', async () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    const result = await tracker.isFeatureEnabled('flag-x', 'd-1')
    expect(result).toBe(true)
    const call = parent.calls.find((c) => c.method === 'isFeatureEnabled')!
    expect(call.args).toEqual(['flag-x', 'd-1'])
  })

  it('getAllFlags forwards to parent and returns its result', async () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    const result = await tracker.getAllFlags('d-1')
    expect(result).toEqual({ flagA: true })
    const call = parent.calls.find((c) => c.method === 'getAllFlags')!
    expect(call.args).toEqual(['d-1'])
  })

  it('shutdown forwards to parent', async () => {
    const tracker = makeTracker({ requestId: 'r-1' }, parent)
    await tracker.shutdown()
    expect(parent.calls.some((c) => c.method === 'shutdown')).toBe(true)
  })

  it('group() stamps traits and delegates to parent.group', () => {
    const tracker = makeTracker(
      { userId: 'u-1', sessionIdFromHeader: 's-1', requestId: 'r-1' },
      parent,
    )
    tracker.group('organization', 'org-99', { name: 'Acme' })

    const call = parent.calls.find((c) => c.method === 'group')!
    const [groupType, groupKey, traits] = call.args as [string, string, Record<string, unknown>]
    expect(groupType).toBe('organization')
    expect(groupKey).toBe('org-99')
    expect(traits.name).toBe('Acme')
    expect(traits.distinct_id).toBe('u-1')
    expect(traits.$session_id).toBe('s-1')
    expect(traits.request_id).toBe('r-1')
  })

  it('captureException stamps request context and delegates to parent.captureException', () => {
    const tracker = makeTracker(
      { userId: 'u-1', sessionIdFromHeader: 's-1', requestId: 'r-1' },
      parent,
    )
    const err = new Error('boom')
    tracker.captureException(err, 'u-1', { extra: 'info' })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [error, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(error).toBe(err)
    expect(distinctId).toBe('u-1')
    expect(properties.extra).toBe('info')
    expect(properties.distinct_id).toBe('u-1')
    expect(properties.$session_id).toBe('s-1')
    expect(properties.request_id).toBe('r-1')
  })
})

// ---------------------------------------------------------------------------
// Request-scoped captureException overload (context-only shape)
// ---------------------------------------------------------------------------

describe('RequestAnalyticsTrackerImpl — captureException context-only overload', () => {
  let parent: FakeParent

  beforeEach(() => {
    parent = new FakeParent()
  })

  it('2-arg context shape: auto-fills distinctId from scoped userId', () => {
    const tracker = makeTracker(
      { userId: 'u-scoped', sessionIdFromHeader: 's-1', requestId: 'r-1' },
      parent,
    )
    const err = new Error('ctx-error')
    tracker.captureException(err, { statusCode: 500, fileName: 'handler.ts' })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [error, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(error).toBe(err)
    expect(distinctId).toBe('u-scoped')
    expect(properties.statusCode).toBe(500)
    expect(properties.fileName).toBe('handler.ts')
    expect(properties.distinct_id).toBe('u-scoped')
    expect(properties.$session_id).toBe('s-1')
    expect(properties.request_id).toBe('r-1')
  })

  it('2-arg context shape: falls back to sessionIdFromHeader when no userId', () => {
    const tracker = makeTracker({ sessionIdFromHeader: 's-anon', requestId: 'r-2' }, parent)
    tracker.captureException(new Error('anon-err'), { extra: 'yes' })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(distinctId).toBe('s-anon')
    expect(properties.extra).toBe('yes')
    expect(properties.distinct_id).toBe('s-anon')
  })

  it('2-arg context shape: falls back to requestId when no userId and no session', () => {
    const tracker = makeTracker({ requestId: 'r-only' }, parent)
    tracker.captureException(new Error('bare'), { note: 'minimal' })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(distinctId).toBe('r-only')
    expect(properties.note).toBe('minimal')
  })

  it('2-arg no-context shape: still stamps and uses scoped distinctId', () => {
    const tracker = makeTracker({ userId: 'u-bare', requestId: 'r-1' }, parent)
    tracker.captureException(new Error('no-ctx'))

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(distinctId).toBe('u-bare')
    expect(properties.request_id).toBe('r-1')
  })

  it('3-arg legacy shape still works unmodified alongside new overload', () => {
    const tracker = makeTracker(
      { userId: 'u-legacy', sessionIdFromHeader: 's-1', requestId: 'r-1' },
      parent,
    )
    tracker.captureException(new Error('legacy'), 'explicit-id', { legacy: true })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [, distinctId, properties] = call.args as [Error, string, Record<string, unknown>]
    expect(distinctId).toBe('explicit-id')
    expect(properties.legacy).toBe(true)
    expect(properties.distinct_id).toBe('u-legacy')
  })
})
