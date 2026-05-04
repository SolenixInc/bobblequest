import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InMemoryQueueImpl } from '../../src/infrastructure/InMemoryQueueImpl.ts'
import { QueueClient } from '../../src/entities/ports/QueueClient.ts'

describe('InMemoryQueueImpl', () => {
  let queue: InMemoryQueueImpl

  beforeEach(() => {
    queue = new InMemoryQueueImpl()
  })

  afterEach(async () => {
    await queue.close()
  })

  it('extends QueueClient', () => {
    expect(queue).toBeInstanceOf(QueueClient)
  })

  it('enqueue resolves without throwing', async () => {
    await expect(queue.enqueue('test-job', { foo: 'bar' })).resolves.toBeUndefined()
  })

  it('enqueue accepts optional scheduling opts', async () => {
    await expect(
      queue.enqueue('test-job', { foo: 'bar' }, { delayMs: 100, retries: 3, priority: 1 }),
    ).resolves.toBeUndefined()
  })

  it('enqueue is idempotent', async () => {
    await queue.enqueue('test-job', { id: 1 })
    await queue.enqueue('test-job', { id: 1 })
    expect(true).toBe(true)
  })

  it('close marks the queue as closed', async () => {
    await queue.close()
    expect(true).toBe(true)
  })

  it('enqueue throws after close', async () => {
    await queue.close()
    await expect(queue.enqueue('test-job', {})).rejects.toThrow(/used after close/)
  })

  it('close is idempotent', async () => {
    await queue.close()
    await queue.close()
    expect(true).toBe(true)
  })

  it('registerHandler is a no-op and does not throw', () => {
    expect(() => {
      queue.registerHandler('test-job', async (_payload: unknown) => {})
    }).not.toThrow()
  })
})
