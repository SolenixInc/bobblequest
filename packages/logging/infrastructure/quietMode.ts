/**
 * @fileoverview Global Quiet Mode State
 *
 * This module provides a global quiet mode flag that can be set once
 * at application startup and checked by all loggers throughout the application.
 */

/**
 * Global quiet mode state
 * When true, loggers should suppress verbose output
 */
let globalQuietMode = false

/**
 * Set the global quiet mode
 * Should be called once at application startup
 *
 * @param quiet - Whether to enable quiet mode
 */
export function setGlobalQuietMode(quiet: boolean): void {
  globalQuietMode = quiet
}

/**
 * Get the current global quiet mode state
 *
 * @returns Current quiet mode state
 */
export function isGlobalQuietMode(): boolean {
  return globalQuietMode
}
