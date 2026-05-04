/**
 * @fileoverview Context information for request-scoped logging.
 */

export interface LogContext {
  /** Unique request identifier. */
  requestId: string
  /** Application user identifier (optional for global loggers). */
  userId?: string
  /** File path where the log originated. */
  fileName?: string
  /** Additional context data. */
  metadata?: Record<string, unknown>
}
