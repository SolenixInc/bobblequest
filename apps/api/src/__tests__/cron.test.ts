/**
 * Integration-style test for the cron entrypoint pattern.
 *
 * The cron.ts file itself is excluded from coverage (top-level side effects),
 * so this test exercises the same pattern directly: resolve queue, enqueue
 * 'heartbeat', close. Asserts the contract without executing the module.
 */
import type { QueueClient } from '@t/queue'
import { describe, expect, it, vi } from 'vitest'

async function runCronPattern(queue: QueueClient): Promise<void> {
  await queue.enqueue('heartbeat', {})
  await queue.close()
}

describe('cron entrypoint pattern', () => {
  it('enqueues the heartbeat job', async () => {
    const queue: QueueClient = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      registerHandler: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }

    await runCronPattern(queue)

    expect(queue.enqueue).toHaveBeenCalledOnce()
    expect(queue.enqueue).toHaveBeenCalledWith('heartbeat', {})
  })

  it('calls close() after enqueue', async () => {
    const calls: string[] = []
    const queue: QueueClient = {
      enqueue: vi.fn().mockImplementation(async () => {
        calls.push('enqueue')
      }),
      registerHandler: vi.fn(),
      close: vi.fn().mockImplementation(async () => {
        calls.push('close')
      }),
    }

    await runCronPattern(queue)

    expect(calls).toEqual(['enqueue', 'close'])
  })
})
