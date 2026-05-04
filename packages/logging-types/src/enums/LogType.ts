/**
 * @fileoverview Log entry type variants for different logging scenarios.
 */

export enum LogType {
  /** Human-readable text log entries (local dev). */
  LOCAL = 'text',
  /** JSON-structured log entries (production). */
  STRUCTURED = 'json',
  /** Error-only / suppressed log entries. */
  QUIET = 'error',
}
