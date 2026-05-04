import { RequestLogger, type createGlobalLogger } from '@t/logging'
import { getLogLevel } from './getLogLevel.ts'

/**
 * Logs an error at the appropriate level based on status code.\
 * \
 * @param logger - RequestLogger or fallback logger
 * @param statusCode - HTTP status code
 * @param payload - Log payload with message and metadata
 * @param fileName - Source file name for logging
 */
export function logErrorAtAppropriateLevel(
  logger: RequestLogger | ReturnType<typeof createGlobalLogger>,
  statusCode: number,
  payload: { message: string; metadata: Record<string, unknown> },
  fileName: string,
): void {
  const logLevel = getLogLevel(statusCode)

  if (logger instanceof RequestLogger) {
    if (logLevel === 'warning') {
      logger.warning({ ...payload, fileName })
    } else if (logLevel === 'info') {
      logger.info({ ...payload, fileName })
    } else {
      logger.error({ ...payload, fileName })
    }
  } else {
    // Fallback logger doesn't have warning/info methods, use error
    logger.error(payload)
  }
}
