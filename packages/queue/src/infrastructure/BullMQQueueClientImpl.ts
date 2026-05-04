import type { RedisConfig } from '@t/config'
import type { Logger } from '@t/logging'
import { type Job, Queue, Worker } from 'bullmq'
import { QueueClient } from '../entities/ports/QueueClient.ts'

export class BullMQQueueClientImpl extends QueueClient {
  private queue: Queue
  private workers: Worker[] = []
  private handlers: Map<string, (payload: unknown) => Promise<void>> = new Map()

  constructor(
    config: RedisConfig,
    private logger: Logger,
    private queueName: string = 'default',
  ) {
    super()

    const connection = {
      host: config.host,
      port: config.port,
      password: config.password,
    }

    this.queue = new Queue(this.queueName, { connection })

    // Create a worker that processes jobs by looking up the registered handler
    const worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const handler = this.handlers.get(job.name)
        if (!handler) {
          this.logger.warn({
            message: `No handler registered for job: ${job.name}`,
            metadata: { jobId: job.id },
          })
          return
        }

        try {
          await handler(job.data)
        } catch (error) {
          this.logger.error({
            message: `Job failed: ${job.name}`,
            error,
            metadata: { jobId: job.id },
          })
          throw error
        }
      },
      { connection },
    )

    worker.on('failed', (job, err) => {
      this.logger.error({
        message: `BullMQ Worker Job Failed: ${job?.name}`,
        error: err,
        metadata: { jobId: job?.id },
      })
    })

    this.workers.push(worker)
  }

  async enqueue<T = unknown>(jobName: string, payload: T): Promise<void> {
    await this.queue.add(jobName, payload)
    this.logger.info({
      message: `Job enqueued: ${jobName}`,
    })
  }

  registerHandler<T = unknown>(jobName: string, handler: (payload: T) => Promise<void>): void {
    // We cast to unknown so it can be stored generically in the map.
    // The consumer's type T is trusted when they enqueue/register.
    this.handlers.set(jobName, handler as (payload: unknown) => Promise<void>)
  }

  async close(): Promise<void> {
    await Promise.all([this.queue.close(), ...this.workers.map((w) => w.close())])
  }
}
