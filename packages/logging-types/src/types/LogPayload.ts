/**
 * @fileoverview Structured payload shape for logger methods.
 */

export interface LogPayload {
  message?: string
  metadata?: Record<string, unknown>
  fileName?: string
  err?: unknown
  [key: string]: unknown
}
