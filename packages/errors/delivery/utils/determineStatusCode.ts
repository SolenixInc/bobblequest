import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'
import { hasStatusCode } from './hasStatusCode.ts'

/**
 * Determines the HTTP status code for an error.\
 * \
 * @param error - The error to analyze
 * @returns HTTP status code (from AppError, external error statusCode, or 500 default)
 */
export function determineStatusCode(error: Error): ContentfulStatusCode {
  if (error instanceof AppError) {
    return error.status
  }
  if (hasStatusCode(error) && error.statusCode) {
    return error.statusCode as ContentfulStatusCode
  }
  return 500
}
