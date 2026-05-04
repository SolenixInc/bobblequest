/**
 * @fileoverview Awilix registrar for React Native Logger (same shape as server).
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import { type Container, asFunction, dependencyKeys, lifetimeConfig } from '@t/dependency-injection'
import type { LogContext } from '@t/logging-types'
import { AnalyticsBridgedLogger } from '../infrastructure/AnalyticsBridgedLogger.ts'
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.ts'

export const LOGGER_DEPENDENCY_KEY = dependencyKeys.global.LOGGER

export interface LoggerRnDIOptions {
  context?: LogContext
  analytics?: AnalyticsTracker
}

/**
 * Registers Logger as a singleton in the container.
 * If options.analytics is present and registered in the container, wraps in AnalyticsBridgedLogger.
 */
export function registerLoggerRnDI(container: Container, options: LoggerRnDIOptions = {}): void {
  container.register({
    [LOGGER_DEPENDENCY_KEY]: asFunction(
      () => {
        const consoleLogger = new ConsoleLogger(options.context ?? { requestId: 'rn-global' })
        return options.analytics
          ? new AnalyticsBridgedLogger({ logger: consoleLogger, tracker: options.analytics })
          : consoleLogger
      },
      { lifetime: lifetimeConfig.SINGLETON },
    ),
  })
}
