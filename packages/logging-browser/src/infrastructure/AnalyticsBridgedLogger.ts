/**
 * @fileoverview AnalyticsBridgedLogger decorator that forwards warn/error/fatal to analytics.
 */

import type { AnalyticsTracker } from '@t/analytics-types'
import type { LogArg } from '@t/logging-types'
import type { LogContext } from '@t/logging-types'
import { Logger } from '@t/logging-types'

export class AnalyticsBridgedLogger extends Logger {
  readonly requestId: string
  readonly userId: string | undefined

  constructor(private readonly params: { logger: Logger; tracker?: AnalyticsTracker }) {
    super()
    this.requestId = params.logger.requestId
    this.userId = params.logger.userId
  }

  private createErrorPayload(arg: LogArg, message?: string): { err: Error; message: string } {
    const payload = typeof arg === 'string' ? { message: arg } : arg
    const finalMessage =
      typeof arg === 'string' && message
        ? `${arg} ${message}`
        : typeof arg === 'string'
          ? arg
          : (arg.message ?? '')
    const err =
      payload.err instanceof Error ? payload.err : new Error(finalMessage || 'Unknown error')
    return { err, message: finalMessage }
  }

  debug(arg: LogArg, message?: string): void {
    this.params.logger.debug(arg, message)
  }

  info(arg: LogArg, message?: string): void {
    this.params.logger.info(arg, message)
  }

  warn(arg: LogArg, message?: string): void {
    this.params.logger.warn(arg, message)
    const { err } = this.createErrorPayload(arg, message)
    this.params.tracker?.captureException?.(err, this.userId ?? 'anonymous')
  }

  error(arg: LogArg, message?: string): void {
    this.params.logger.error(arg, message)
    const { err } = this.createErrorPayload(arg, message)
    this.params.tracker?.captureException?.(err, this.userId ?? 'anonymous')
  }

  fatal(arg: LogArg, message?: string): void {
    this.params.logger.fatal(arg, message)
    const { err } = this.createErrorPayload(arg, message)
    this.params.tracker?.captureException?.(err, this.userId ?? 'anonymous')
  }

  child(bindings: Partial<LogContext> & Record<string, unknown>): Logger {
    return new AnalyticsBridgedLogger({
      logger: this.params.logger.child(bindings),
      tracker: this.params.tracker,
    })
  }
}
