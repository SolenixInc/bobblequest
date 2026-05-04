/**
 * @fileoverview @t/logging public surface â€” winston-backed structured logger.
 */

import type { LogContext } from './entities/types/index.ts'
import { GlobalLogger } from './infrastructure/globalLogger.ts'
import { RequestLogger } from './infrastructure/requestLogger.ts'
import type { WinstonLoggerOptions } from './infrastructure/winstonLogger.ts'

export * from './entities/index.ts'
export * from './infrastructure/index.ts'
export * from './dependency-injection/index.ts'
export { VERSION } from './version.ts'
export { shutdownLogging } from './lifecycle/shutdownLogging.ts'

type FileNameOrOptions = string | (Partial<LogContext> & WinstonLoggerOptions)

function normalizeFactoryArg(arg: FileNameOrOptions | undefined): {
  context: LogContext
  options: WinstonLoggerOptions
} {
  if (typeof arg === 'string') {
    return { context: { requestId: 'global', fileName: arg }, options: {} }
  }
  const { requestId, userId, fileName, metadata, ...options } = arg ?? {}
  return {
    context: { requestId: requestId ?? 'global', userId, fileName, metadata },
    options: options as WinstonLoggerOptions,
  }
}

export function createLogger(arg?: FileNameOrOptions): GlobalLogger {
  const { context, options } = normalizeFactoryArg(arg)
  return new GlobalLogger(context, options)
}

export function createGlobalLogger(arg?: FileNameOrOptions): GlobalLogger {
  return createLogger(arg)
}

export function createRequestLogger(
  context: LogContext,
  options: WinstonLoggerOptions = {},
): RequestLogger {
  return new RequestLogger(context, options)
}
