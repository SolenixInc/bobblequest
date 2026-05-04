/**
 * @fileoverview Log levels supported by the logger port.
 * Values are lowercase to match Winston's log levels.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warn',
  ERROR = 'error',
  CRITICAL = 'crit',
}
