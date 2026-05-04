/**
 * @fileoverview Registers a pre-constructed GlobalLogger singleton into the
 * container. Distinct from `registerLoggerFactoryDI` which registers the
 * factory function itself.
 */

import { type Container, asFunction, dependencyKeys, lifetimeConfig } from '@t/dependency-injection'
import type { LogContext } from '../entities/types/index.ts'
import { GlobalLogger } from '../infrastructure/globalLogger.ts'

export interface LoggerDIOptions {
  context?: LogContext
  redactExtraPaths?: readonly string[]
  quiet?: boolean
}

/**
 * Re-exported alias of `dependencyKeys.global.LOGGER` (owned by
 * `@t/dependency-injection`). Preserved for existing call sites and tests.
 */
export const LOGGER_DEPENDENCY_KEY = dependencyKeys.global.LOGGER

export function registerLoggerDI(container: Container, options: LoggerDIOptions = {}): void {
  container.register({
    [LOGGER_DEPENDENCY_KEY]: asFunction(
      () =>
        new GlobalLogger(options.context ?? { requestId: 'global' }, {
          redactExtraPaths: options.redactExtraPaths,
          quiet: options.quiet,
        }),
      { lifetime: lifetimeConfig.SINGLETON },
    ),
  })
}
