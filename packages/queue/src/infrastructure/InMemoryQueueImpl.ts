import { QueueClient } from '../entities/ports/QueueClient.ts'

/**
 * In-memory `QueueClient` implementation used for tests and local
 * development. Jobs are discarded immediately (no actual processing).
 *
 * This is a minimal stub sufficient to satisfy `@t/api` composition
 * and lifecycle resolution. A real backend (BullMQ, Inngest, etc.) should
 * replace this once queue workers are implemented.
 */
export class InMemoryQueueImpl extends QueueClient {
  private closed = false

  async enqueue<T>(
    _jobName: string,
    _payload: T,
    _opts?: { delayMs?: number; retries?: number; priority?: number },
  ): Promise<void> {
    this.assertOpen()
    // Stub: no-op. Jobs are not actually processed in-memory.
  }

  registerHandler<T = unknown>(_jobName: string, _handler: (payload: T) => Promise<void>): void {
    // Stub: no-op. In-memory queue does not process jobs; handlers are not invoked.
  }

  async close(): Promise<void> {
    this.closed = true
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('InMemoryQueueImpl: used after close()')
    }
  }
}
