/**
 * @fileoverview Factory for creating browser Logger instances with singleton pattern.
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import type { Logger } from '@t/logging-types'
import { AnalyticsBridgedLogger } from '../infrastructure/AnalyticsBridgedLogger.ts'
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.ts'

let singleton: Logger | undefined

/**
 * Create a browser Logger instance.
 * Returns the same instance on subsequent calls (singleton).
 *
 * @param opt Optional configuration - if analytics tracker is provided, wraps logger in AnalyticsBridgedLogger
 * @returns Logger instance
 */
export function createBrowserLogger(opt?: { analytics?: AnalyticsTracker }): Logger {
  if (singleton) return singleton

  const consoleLogger = new ConsoleLogger(/* default context */)
  singleton = opt?.analytics
    ? new AnalyticsBridgedLogger({ logger: consoleLogger, tracker: opt.analytics })
    : consoleLogger

  return singleton
}

/**
 * Get the existing logger instance or create a new one.
 *
 * @returns Logger instance
 */
export function getLogger(): Logger {
  return singleton ?? createBrowserLogger()
}
