import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// ioredis mock
// ---------------------------------------------------------------------------
// The mock factory runs at module-eval time. We use a module-level registry
// so each describe block can push a fresh FakeClient before constructing
// RedisCacheImpl, and the mock constructor picks it up.
// ---------------------------------------------------------------------------

type SubscribeHandler = (channel: string, raw: string) => void

interface FakeClient {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
  eval: ReturnType<typeof vi.fn>
  publish: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  ping: ReturnType<typeof vi.fn>
  quit: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  duplicate: ReturnType<typeof vi.fn>
  on: (event: string, handler: SubscribeHandler) => void
  _emit: (event: string, ...args: unknown[]) => void
  _listeners: Record<string, SubscribeHandler[]>
}

function makeFakeClient(): FakeClient {
  const listeners: Record<string, SubscribeHandler[]> = {}
  const client: FakeClient = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    duplicate: vi.fn(),
    on: (event, handler) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    },
    _emit: (event, ...args) => {
      for (const h of listeners[event] ?? []) {
        ;(h as (...a: unknown[]) => void)(...args)
      }
    },
    _listeners: listeners,
  }
  // duplicate() returns a new fake client tracked as a spy result
  client.duplicate.mockImplementation(() => makeFakeClient())
  return client
}

// Registry: each new Redis() call pops from this queue.
const clientQueue: FakeClient[] = []

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    private _impl: FakeClient
    constructor() {
      const impl = clientQueue.shift()
      if (!impl) throw new Error('No FakeClient queued for this Redis() call')
      this._impl = impl
      // biome-ignore lint/correctness/noConstructorReturn: Proxy required for ioredis duck-typing in tests
      return new Proxy(this, {
        get: (target, prop) => {
          if (prop in target) return (target as Record<string | symbol, unknown>)[prop]
          const implProp = (target._impl as Record<string | symbol, unknown>)[prop]
          return typeof implProp === 'function' ? implProp.bind(target._impl) : implProp
        },
      })
    }
  },
}))

// ---------------------------------------------------------------------------
// SUT import — AFTER mock registration
// ---------------------------------------------------------------------------

import { CacheLockTimeoutError } from '../src/infrastructure/InMemoryCacheImpl.ts'
import { RedisCacheImpl } from '../src/infrastructure/RedisCacheImpl.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(count = 1): FakeClient[] {
  const clients = Array.from({ length: count }, () => makeFakeClient())
  clientQueue.push(...clients)
  return clients
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisCacheImpl — get/set/del', () => {
  it('get returns null when client returns null', async () => {
    const [c] = setup()
    c.get.mockResolvedValue(null)
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.get('k')).toBeNull()
    await cache.close()
  })

  it('get parses JSON when value exists', async () => {
    const [c] = setup()
    c.get.mockResolvedValue(JSON.stringify({ x: 1 }))
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.get('k')).toEqual({ x: 1 })
    await cache.close()
  })

  it('set without TTL calls client.set without EX', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.set('k', { v: 1 })
    expect(c.set).toHaveBeenCalledWith('k', JSON.stringify({ v: 1 }))
    await cache.close()
  })

  it('set with TTL calls client.set with EX', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.set('k', 'val', 30)
    expect(c.set).toHaveBeenCalledWith('k', '"val"', 'EX', 30)
    await cache.close()
  })

  it('del calls client.del', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.del('k')
    expect(c.del).toHaveBeenCalledWith('k')
    await cache.close()
  })
})

describe('RedisCacheImpl — incr', () => {
  it('returns numeric result from eval', async () => {
    const [c] = setup()
    c.eval.mockResolvedValue(5)
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.incr('counter')).toBe(5)
    await cache.close()
  })

  it('converts non-number eval result to number', async () => {
    const [c] = setup()
    c.eval.mockResolvedValue('7')
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.incr('counter')).toBe(7)
    await cache.close()
  })

  it('incr with TTL passes ttl string arg', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.incr('counter', 10)
    expect(c.eval.mock.calls[0][3]).toBe('10')
    await cache.close()
  })

  it('incr without TTL passes empty string ttl arg', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.incr('counter')
    expect(c.eval.mock.calls[0][3]).toBe('')
    await cache.close()
  })
})

describe('RedisCacheImpl — withLock', () => {
  it('throws when ttlSeconds <= 0', async () => {
    const [_c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await expect(cache.withLock('k', 0, async () => {})).rejects.toThrow(/ttlSeconds must be > 0/)
    await cache.close()
  })

  it('acquires lock (SET NX OK) and runs fn', async () => {
    const [c] = setup()
    c.set.mockResolvedValue('OK')
    c.eval.mockResolvedValue(1)
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const result = await cache.withLock('k', 5, async () => 'done')
    expect(result).toBe('done')
    await cache.close()
  })

  it('throws CacheLockTimeoutError when SET NX never returns OK', async () => {
    const [c] = setup()
    c.set.mockResolvedValue(null)
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await expect(cache.withLock('k', 0.1, async () => {})).rejects.toBeInstanceOf(
      CacheLockTimeoutError,
    )
    await cache.close()
  })

  it('swallows lock release errors', async () => {
    const [c] = setup()
    c.set.mockResolvedValue('OK')
    c.eval.mockRejectedValue(new Error('redis gone'))
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await expect(cache.withLock('k', 5, async () => 'ok')).resolves.toBe('ok')
    await cache.close()
  })
})

describe('RedisCacheImpl — publish/subscribe', () => {
  it('publish serializes payload to JSON', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.publish('ch', { hello: 'world' })
    expect(c.publish).toHaveBeenCalledWith('ch', JSON.stringify({ hello: 'world' }))
    await cache.close()
  })

  it('subscribe delivers deserialized messages to handler', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const received: unknown[] = []
    await cache.subscribe('ch', (p) => received.push(p))

    // Get the subscriber created by duplicate()
    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    sub._emit('message', 'ch', JSON.stringify({ x: 1 }))
    expect(received).toEqual([{ x: 1 }])
    await cache.close()
  })

  it('subscribe falls back to raw string on invalid JSON', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const received: unknown[] = []
    await cache.subscribe('ch', (p) => received.push(p))

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    sub._emit('message', 'ch', 'not-json')
    expect(received).toEqual(['not-json'])
    await cache.close()
  })

  it('subscribe to same channel twice only calls subscriber.subscribe once', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.subscribe('ch', () => {})
    await cache.subscribe('ch', () => {})

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    expect(sub.subscribe).toHaveBeenCalledTimes(1)
    await cache.close()
  })

  it('unsubscribe removes handler; unsubscribes from channel when no more handlers', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const unsub = await cache.subscribe('ch', () => {})
    await unsub()

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    expect(sub.unsubscribe).toHaveBeenCalledWith('ch')
    await cache.close()
  })

  it('unsubscribe does nothing when called on already-empty channel', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const unsub = await cache.subscribe('ch', () => {})
    await unsub()
    await expect(unsub()).resolves.toBeUndefined()
    await cache.close()
  })

  it('swallows subscriber handler exceptions', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.subscribe('ch', () => {
      throw new Error('handler error')
    })

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    expect(() => sub._emit('message', 'ch', '"data"')).not.toThrow()
    await cache.close()
  })

  it('message on channel with no handlers is a no-op', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const unsub = await cache.subscribe('ch', () => {})
    await unsub()

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    expect(() => sub._emit('message', 'ch', '"msg"')).not.toThrow()
    await cache.close()
  })

  it('unsubscribe tolerates subscriber.unsubscribe throwing', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    const unsub = await cache.subscribe('ch', () => {})
    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    sub.unsubscribe.mockRejectedValue(new Error('connection gone'))
    await expect(unsub()).resolves.toBeUndefined()
    await cache.close()
  })
})

describe('RedisCacheImpl — close', () => {
  it('quits the command client', async () => {
    const [c] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.close()
    expect(c.quit).toHaveBeenCalled()
  })

  it('quits both clients when subscriber was created', async () => {
    const [_cmd] = setup()
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await cache.subscribe('ch', () => {})
    await cache.close()

    const sub = _cmd.duplicate.mock.results[0].value as FakeClient
    expect(sub.quit).toHaveBeenCalled()
  })

  it('falls back to disconnect when quit throws', async () => {
    const [c] = setup()
    c.quit.mockRejectedValue(new Error('network error'))
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await expect(cache.close()).resolves.toBeUndefined()
    expect(c.disconnect).toHaveBeenCalled()
  })

  it('swallows disconnect error when both quit and disconnect throw', async () => {
    const [c] = setup()
    c.quit.mockRejectedValue(new Error('quit failed'))
    c.disconnect.mockImplementation(() => {
      throw new Error('disconnect failed')
    })
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    await expect(cache.close()).resolves.toBeUndefined()
  })
})

describe('RedisCacheImpl — ping', () => {
  it('returns true when client returns PONG', async () => {
    const [c] = setup()
    c.ping.mockResolvedValue('PONG')
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.ping()).toBe(true)
    await cache.close()
  })

  it('returns false when client returns something else', async () => {
    const [c] = setup()
    c.ping.mockResolvedValue('ERROR')
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.ping()).toBe(false)
    await cache.close()
  })

  it('returns false when client throws', async () => {
    const [c] = setup()
    c.ping.mockRejectedValue(new Error('redis gone'))
    const cache = new RedisCacheImpl({ url: 'redis://localhost' })
    expect(await cache.ping()).toBe(false)
    await cache.close()
  })
})

describe('RedisCacheImpl — constructor variants', () => {
  it('constructs with host/port/db/password/tls config', () => {
    setup()
    expect(
      () =>
        new RedisCacheImpl({
          host: '127.0.0.1',
          port: 6380,
          db: 1,
          password: 'secret',
          tls: true,
        }),
    ).not.toThrow()
    clientQueue.length = 0 // drain any remaining
  })

  it('constructs with host only (no password, no tls)', () => {
    setup()
    expect(() => new RedisCacheImpl({ host: '127.0.0.1', port: 6379 })).not.toThrow()
    clientQueue.length = 0
  })

  it('constructs without host or port (uses defaults 127.0.0.1:6379)', () => {
    setup()
    expect(() => new RedisCacheImpl({})).not.toThrow()
    clientQueue.length = 0
  })
})
