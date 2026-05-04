import type { Context } from 'hono'
import { AppError } from '../../entities/ports/AppError.ts'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'
import { getErrorCategory } from './getErrorCategory.ts'

/**
 * Builds enriched metadata object for error logging.\
 * \
 * @param error - The error being processed
 * @param statusCode - HTTP status code
 * @param c - Hono context
 * @param userId - User ID from context
 * @param requestId - Request ID from context
 * @returns Metadata object with error details for observability
 */
export function buildErrorMetadata(
  error: Error,
  statusCode: number,
  c: Context,
  userId: string,
  requestId: string | undefined,
): Record<string, unknown> {
  const errorCategory = getErrorCategory(statusCode, error)

  const metadata: Record<string, unknown> = {
    errorCategory,
    statusCode,
    isExpected: statusCode < 500,
    route: c.req.path,
    method: c.req.method,
    userId,
    requestId,
    message: error.message,
    name: error instanceof AppError ? error.name : error.name,
    cause: error.cause,
    stack: error.stack,
  }

  // Add validation errors to metadata if present
  if (error instanceof ValidationError && error.cause) {
    const cause = error.cause as Record<string, unknown>
    if (cause.validationErrors) {
      metadata.validationErrors = cause.validationErrors
    }
  }

  return metadata
}
