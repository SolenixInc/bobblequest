/**
 * @fileoverview Abstract Logger port.
 *
 * Defines the structural contract every logger implementation must satisfy.
 * Method signatures cover the common call shapes used across packages:
 *   - `logger.error(payload)` — single object
 *   - `logger.debug({ message, metadata }, "")` — object plus trailing string
 *   - `logger.warning(...)` — `.warn()` alias
 */

import type { LogArg } from '../types/LogArg.ts'
import type { LogContext } from '../types/LogContext.ts'

export abstract class Logger {
  abstract readonly requestId: string
  abstract readonly userId: string | undefined

  abstract debug(arg: LogArg, message?: string): void
  abstract info(arg: LogArg, message?: string): void
  abstract warn(arg: LogArg, message?: string): void
  abstract error(arg: LogArg, message?: string): void
  abstract fatal(arg: LogArg, message?: string): void

  /** Alias of `warn`. Retained because some call sites use `.warning(...)`. */
  warning(arg: LogArg, message?: string): void {
    this.warn(arg, message)
  }

  abstract child(bindings: Partial<LogContext> & Record<string, unknown>): Logger
}
