import type { Container } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import type { QueueClient } from '@t/queue'
import { heartbeatHandler } from './handlers/heartbeatHandler'
import { pingHandler } from './handlers/pingHandler'

export function registerJobHandlers(container: Container): void {
  const queue = container.resolve<QueueClient>(dependencyKeys.global.QUEUE)
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)

  queue.registerHandler('ping', pingHandler(logger))
  queue.registerHandler('heartbeat', heartbeatHandler(logger))
}
