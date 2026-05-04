import type { AppError } from '../entities/ports/AppError.ts'

/**
 * Converts an AppError into a standardized response object.
 *
 * @param {AppError} error - The application error to be converted.
 * @param {string} [requestId] - Optional request ID for tracking.
 * @param {string} [environment] - Optional environment name. Callers must supply
 *   this explicitly; no process.env lookup is performed so this module is safe
 *   to bundle in browser targets.
 *
 * @returns {object} A standardized error response object.
 */
export const toAppErrorResponse = (error: AppError, requestId?: string, environment?: string) => {
  const isProduction = environment === 'production'

  return {
    success: false,
    name: error.name,
    status: error.status,
    message: error.message,
    details: error.details,
    responseMessage: error.responseMessage,
    stack: !isProduction ? error.stack : undefined,
    requestId: requestId ?? undefined,
    ...(error.cause !== undefined && { cause: error.cause }),
  }
}
