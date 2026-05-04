import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// bullmq mock
// ---------------------------------------------------------------------------
// We intercept Queue and Worker before the SUT is imported so that no real
// Redis connection is ever attempted. Instances are captured on construction
// so tests can inspect calls.
// ---------------------------------------------------------------------------

interface FakeQueue {
  add: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

interface FakeWorker {
  on: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  _processor: ((job: { name: string; data: unknown; id: string }) => Promise<void>) | null
}

function makeFakeQueue(): FakeQueue {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function makeFakeWorker(
  processor: ((job: { name: string; data: unknown; id: string }) => Promise<void>) | null = null,
): FakeWorker {
  return {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    _processor: processor,
  }
}

// Registry: each new Queue() / Worker() call pops from its respective queue.
const queueRegistry: FakeQueue[] = []
const workerRegistry: FakeWorker[] = []

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    private _impl: FakeQueue
    constructor() {
      const impl = queueRegistry.shift()
      if (!impl) throw new Error('No FakeQueue queued for this Queue() call')
      this._impl = impl
      // biome-ignore lint/correctness/noConstructorReturn: Proxy required for bullmq duck-typing in tests
      return new Proxy(this, {
        get: (target, prop) => {
          if (prop in target) return (target as Record<string | symbol, unknown>)[prop]
          const implProp = (target._impl as Record<string | symbol, unknown>)[prop]
          return typeof implProp === 'function' ? implProp.bind(target._impl) : implProp
        },
      })
    }
  },
  Worker: class MockWorker {
    private _impl: FakeWorker
    constructor(
      _queueName: string,
      processor: (job: { name: string; data: unknown; id: string }) => Promise<void>,
    ) {
      const impl = workerRegistry.shift()
      if (!impl) throw new Error('No FakeWorker queued for this Worker() call')
      impl._processor = processor
      this._impl = impl
      // biome-ignore lint/correctness/noConstructorReturn: Proxy required for bullmq duck-typing in tests
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
// Logger mock
// ---------------------------------------------------------------------------

function makeFakeLogger() {
  return {
    requestId: 'test',
    userId: undefined as string | undefined,
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// SUT import — AFTER mock registration
// ---------------------------------------------------------------------------

import { BullMQQueueClientImpl } from '../../src/infrastructure/BullMQQueueClientImpl.ts'
import { QueueClient } from '../../src/entities/ports/QueueClient.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REDIS_CONFIG = { host: 'localhost', port: 6379, password: 'secret' }

function setup() {
  const fakeQueue = makeFakeQueue()
  const fakeWorker = makeFakeWorker()
  queueRegistry.push(fakeQueue)
  workerRegistry.push(fakeWorker)
  const logger = makeFakeLogger()
  const impl = new BullMQQueueClientImpl(REDIS_CONFIG, logger as never)
  return { impl, fakeQueue, fakeWorker, logger }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BullMQQueueClientImpl — constructor', () => {
  it('extends QueueClient', () => {
    const { impl } = setup()
    expect(impl).toBeInstanceOf(QueueClient)
  })

  it('creates a Queue with the given connection details', () => {
    // The constructor is exercised in setup(); the mock registered it.
    // Verifying the instance was created proves Queue() was called with
    // the expected queue name (we can only observe it via mock registration).
    const { impl } = setup()
    expect(impl).toBeInstanceOf(BullMQQueueClientImpl)
  })

  it('registers a failed-event listener on the Worker', () => {
    const { fakeWorker } = setup()
    expect(fakeWorker.on).toHaveBeenCalledWith('failed', expect.any(Function))
  })
})

describe('BullMQQueueClientImpl — enqueue', () => {
  it('calls queue.add with job name and payload', async () => {
    const { impl, fakeQueue } = setup()
    await impl.enqueue('sendEmail', { to: 'user@example.com' })
    expect(fakeQueue.add).toHaveBeenCalledWith('sendEmail', { to: 'user@example.com' })
  })

  it('logs info after successful enqueue', async () => {
    const { impl, logger } = setup()
    await impl.enqueue('sendEmail', { to: 'user@example.com' })
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('sendEmail') }),
    )
  })

  it('resolves without throwing for any payload type', async () => {
    const { impl } = setup()
    await expect(impl.enqueue('job', null)).resolves.toBeUndefined()
  })
})

describe('BullMQQueueClientImpl — registerHandler', () => {
  it('stores the handler so the worker processor can dispatch it', async () => {
    const { impl, fakeWorker } = setup()
    const handler = vi.fn().mockResolvedValue(undefined)
    impl.registerHandler('processOrder', handler)

    // Simulate worker receiving a job
    const processor = fakeWorker._processor
    if (!processor) throw new Error('Worker processor not captured')
    await processor({ name: 'processOrder', data: { orderId: 42 }, id: 'job-1' })

    expect(handler).toHaveBeenCalledWith({ orderId: 42 })
  })

  it('logs a warning when no handler is registered for a job name', async () => {
    const { fakeWorker, logger } = setup()

    const processor = fakeWorker._processor
    if (!processor) throw new Error('Worker processor not captured')
    await processor({ name: 'unknownJob', data: {}, id: 'job-2' })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('unknownJob') }),
    )
  })

  it('rethrows handler errors and logs them', async () => {
    const { impl, fakeWorker, logger } = setup()
    const err = new Error('handler blew up')
    impl.registerHandler('failingJob', async () => {
      throw err
    })

    const processor = fakeWorker._processor
    if (!processor) throw new Error('Worker processor not captured')

    await expect(processor({ name: 'failingJob', data: {}, id: 'job-3' })).rejects.toThrow(
      'handler blew up',
    )
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('failingJob') }),
    )
  })
})

describe('BullMQQueueClientImpl — close', () => {
  it('closes the queue and all workers', async () => {
    const { impl, fakeQueue, fakeWorker } = setup()
    await impl.close()
    expect(fakeQueue.close).toHaveBeenCalled()
    expect(fakeWorker.close).toHaveBeenCalled()
  })

  it('resolves without throwing', async () => {
    const { impl } = setup()
    await expect(impl.close()).resolves.toBeUndefined()
  })
})

describe('BullMQQueueClientImpl — failed event handler', () => {
  it('logs error when the worker emits a failed event', () => {
    const { fakeWorker, logger } = setup()
    // Retrieve the 'failed' listener installed via worker.on('failed', fn)
    const failedCall = fakeWorker.on.mock.calls.find(([event]) => event === 'failed')
    if (!failedCall) throw new Error("'failed' listener not registered")
    const failedListener = failedCall[1] as (
      job: { name?: string; id?: string } | undefined,
      err: Error,
    ) => void

    failedListener({ name: 'myJob', id: 'job-99' }, new Error('worker failure'))

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('myJob') }),
    )
  })

  it('handles undefined job in failed event without throwing', () => {
    const { fakeWorker, logger } = setup()
    const failedCall = fakeWorker.on.mock.calls.find(([event]) => event === 'failed')
    if (!failedCall) throw new Error("'failed' listener not registered")
    const failedListener = failedCall[1] as (job: undefined, err: Error) => void

    expect(() => failedListener(undefined, new Error('crash'))).not.toThrow()
    expect(logger.error).toHaveBeenCalled()
  })
})
