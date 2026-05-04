import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { buildContainer } from './composition'
import { registerJobHandlers } from './jobs/registerJobHandlers'
import { installProcessHandlers } from './lifecycle'

const container = buildContainer()

installProcessHandlers(container)
registerJobHandlers(container)

const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)
logger.info('Worker ready and listening for jobs.')
