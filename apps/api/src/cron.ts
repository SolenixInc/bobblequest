/**
 * One-shot cron entrypoint.
 *
 * Invoke on a schedule (e.g., Railway cron service). Registers/upserts
 * repeat jobs on the queue and exits cleanly. Not a daemon.
 *
 * TODO: QueueClient.enqueue opts does not yet accept a `repeat` option.
 * Wire repeat scheduling once the port is extended to support it.
 * For now, the heartbeat job is enqueued as a one-shot placeholder so
 * downstream consumers can observe and test the cron entrypoint pattern.
 */
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import type { QueueClient } from '@t/queue'
import { buildContainer } from './composition'

const container = buildContainer()
const queue = container.resolve<QueueClient>(dependencyKeys.global.QUEUE)
const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)

logger.info({ message: '[cron] registering repeat jobs...' })

await queue.enqueue('heartbeat', {})

logger.info({ message: '[cron] repeat jobs registered, exiting.' })

await queue.close()
process.exit(0)
