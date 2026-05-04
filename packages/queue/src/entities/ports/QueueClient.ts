/**
 * Canonical background job queue port.
 *
 * Implementations adapt this surface to a concrete backend (BullMQ,
 * Inngest, SQS, etc.). Consumers depend ONLY on this abstract class.
 */
export abstract class QueueClient {
  /**
   * Schedule a background job.
   *
   * @param jobName - Unique identifier for the job type (e.g. `sendEmail`).
   * @param payload - Serializable payload passed to the worker.
   * @param opts - Optional scheduling overrides (delay, retries, priority).
   */
  abstract enqueue<T>(
    jobName: string,
    payload: T,
    opts?: { delayMs?: number; retries?: number; priority?: number },
  ): Promise<void>

  /**
   * Register a handler for a named job type. Called by worker processes to
   * subscribe to a job before the queue begins processing.
   *
   * @param jobName - Unique identifier for the job type (e.g. `sendEmail`).
   * @param handler - Async function invoked with the deserialized job payload.
   */
  abstract registerHandler<T = unknown>(
    jobName: string,
    handler: (payload: T) => Promise<void>,
  ): void

  /**
   * Release all resources — connections, subscribers, pending timers.
   * Call on graceful shutdown (SIGTERM). After `close()`, the instance
   * MUST NOT be used.
   */
  abstract close(): Promise<void>
}
