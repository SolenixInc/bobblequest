import { beforeEach, describe, expect, it } from 'vitest'
import { AnalyticsTracker } from '../../src/entities/ports/AnalyticsTracker'
import type { LlmEvent } from '../../src/entities/types/LlmEvent'
import type { RevenueEvent } from '../../src/entities/types/RevenueEvent'
import { RequestAnalyticsTrackerImpl } from '../../src/infrastructure/RequestAnalyticsTrackerImpl'

class FakeParent extends AnalyticsTracker {
  calls: { method: string; args: unknown[] }[] = []
  capture(e: string, d: string, p?: Record<string, unknown>, g?: Record<string, string>) {
    this.calls.push({ method: 'capture', args: [e, d, p, g] })
  }
  captureException(error: Error, d: string, p?: Record<string, unknown>) {
    this.calls.push({ method: 'captureException', args: [error, d, p] })
  }
  captureRevenue(event: RevenueEvent) {
    this.calls.push({ method: 'captureRevenue', args: [event] })
  }
  captureLlm(event: LlmEvent) {
    this.calls.push({ method: 'captureLlm', args: [event] })
  }
  identify(d: string, t?: Record<string, unknown>) {
    this.calls.push({ method: 'identify', args: [d, t] })
  }
  alias(d: string, a: string) {
    this.calls.push({ method: 'alias', args: [d, a] })
  }
  group(type: string, key: string, t?: Record<string, unknown>) {
    this.calls.push({ method: 'group', args: [type, key, t] })
  }
  sessionId() {
    return 'parent'
  }
  isFeatureEnabled(_k: string, _d: string) {
    return Promise.resolve(false)
  }
  getAllFlags(_d: string): Promise<Record<string, boolean | string>> {
    this.calls.push({ method: 'getAllFlags', args: [_d] })
    return Promise.resolve({})
  }
  shutdown() {
    this.calls.push({ method: 'shutdown', args: [] })
    return Promise.resolve()
  }
}

describe('RequestAnalyticsTrackerImpl — getAllFlags and shutdown delegation', () => {
  it('getAllFlags forwards to parent and resolves', async () => {
    const parent = new FakeParent()
    const tracker = new RequestAnalyticsTrackerImpl({ parent, requestId: 'r-1' })
    const flags = await tracker.getAllFlags('d-1')
    expect(flags).toEqual({})
    expect(parent.calls.some((c) => c.method === 'getAllFlags')).toBe(true)
  })

  it('shutdown forwards to parent and resolves', async () => {
    const parent = new FakeParent()
    const tracker = new RequestAnalyticsTrackerImpl({ parent, requestId: 'r-1' })
    await tracker.shutdown()
    expect(parent.calls.some((c) => c.method === 'shutdown')).toBe(true)
  })
})

describe('RequestAnalyticsTrackerImpl — captureException (lines 55-60)', () => {
  let parent: FakeParent

  beforeEach(() => {
    parent = new FakeParent()
  })

  it('captureException stamps properties and delegates to parent', () => {
    const tracker = new RequestAnalyticsTrackerImpl({
      parent,
      requestId: 'r-1',
      userId: 'u-1',
      sessionIdFromHeader: 's-1',
    })
    const err = new Error('test error')
    tracker.captureException(err, 'u-1', { ctx: 'test' })

    const call = parent.calls.find((c) => c.method === 'captureException')!
    expect(call).toBeDefined()
    const [, , props] = call.args as [Error, string, Record<string, unknown>]
    expect(props.ctx).toBe('test')
    expect(props.distinct_id).toBe('u-1')
    expect(props.request_id).toBe('r-1')
    expect(props.$session_id).toBe('s-1')
  })

  it('captureException with no extra props still stamps', () => {
    const tracker = new RequestAnalyticsTrackerImpl({
      parent,
      requestId: 'r-1',
    })
    tracker.captureException(new Error('oops'), 'anon')
    const call = parent.calls.find((c) => c.method === 'captureException')!
    const [, , props] = call.args as [Error, string, Record<string, unknown>]
    expect(props.request_id).toBe('r-1')
  })
})
