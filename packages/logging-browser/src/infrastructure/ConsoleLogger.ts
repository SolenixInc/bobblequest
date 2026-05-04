/**
 * @fileoverview ConsoleLogger implements Logger via structured console output.
 */

import type { LogArg } from '@t/logging-types'
import type { LogContext } from '@t/logging-types'
import { Logger } from '@t/logging-types'

export class ConsoleLogger extends Logger {
  readonly requestId: string
  readonly userId: string | undefined
  private readonly _extraBindings: Record<string, unknown>

  constructor(context: (Partial<LogContext> & Record<string, unknown>) | Partial<LogContext> = {}) {
    super()
    const { requestId, userId, ...rest } = context as Partial<LogContext> & Record<string, unknown>
    this.requestId = (requestId as string) ?? 'browser-global'
    this.userId = userId as string | undefined
    this._extraBindings = rest
  }

  private formatLog(arg: LogArg, message?: string) {
    const base = {
      timestamp: new Date().toISOString(),
      level: 'debug', // default, will be overridden per method
      message: typeof arg === 'string' ? arg : (arg.message ?? ''),
      context: {
        requestId: this.requestId,
        userId: this.userId,
      },
      ...this._extraBindings,
    }

    if (typeof arg === 'string') {
      return {
        ...base,
        message: message ? `${arg} ${message}` : arg,
        ...(message ? { meta: message } : {}),
      }
    }

    // Merge additional fields from arg, excluding message to avoid duplication
    const { message: _, ...rest } = arg
    return {
      ...base,
      message: message ? `${arg.message} ${message}` : arg.message,
      ...rest,
    }
  }

  debug(arg: LogArg, message?: string): void {
    console.debug(this.formatLog(arg, message))
  }

  info(arg: LogArg, message?: string): void {
    console.info({ ...this.formatLog(arg, message), level: 'info' })
  }

  warn(arg: LogArg, message?: string): void {
    console.warn({ ...this.formatLog(arg, message), level: 'warn' })
  }

  error(arg: LogArg, message?: string): void {
    console.error({ ...this.formatLog(arg, message), level: 'error' })
  }

  fatal(arg: LogArg, message?: string): void {
    console.error({ ...this.formatLog(arg, message), level: 'fatal' })
  }

  child(bindings: Partial<LogContext> & Record<string, unknown>): Logger {
    return new ConsoleLogger({
      requestId: this.requestId,
      userId: this.userId,
      ...this._extraBindings,
      ...bindings,
    })
  }
}
