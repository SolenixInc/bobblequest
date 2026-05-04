import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { UnknownError } from '../entities/index.ts'

const UNKNOWN_ERROR = {
  name: 'Unknown Error',
  statusCode: 500 as ContentfulStatusCode,
  details: 'An unexpected error occurred that could not be properly categorized.',
}

/**
 * Sanitizes error messages by removing HTML tags and limiting length.
 * This prevents HTML error pages from external services (like object storage or identity providers) from leaking to clients.
 *
 * @param message - The error message to sanitize
 * @returns Sanitized error message without HTML tags, limited to 500 characters
 */
function sanitizeErrorMessage(message: string): string {
  // Don't modify empty strings - preserve them as-is
  if (!message) return message

  // Check if message contains actual HTML tags (not just angle brackets)
  // Look for patterns like <tag>, </tag>, <!DOCTYPE>, etc.
  // More specific regex: must start with < followed by optional / then letter or ! then anything until >
  const hasHtml = /<\/?(?:[a-zA-Z][a-zA-Z0-9]*|!DOCTYPE)[^>]*>/i.test(message)

  if (hasHtml) {
    // Remove HTML tags using regex (handles opening, closing, and declaration tags)
    const withoutHtml = message.replace(/<\/?(?:[a-zA-Z][a-zA-Z0-9]*|!DOCTYPE)[^>]*>/gi, '')
    // Limit length to prevent excessively large error messages
    return withoutHtml.substring(0, 500).trim()
  }

  // For non-HTML messages, only limit length if it exceeds 500 characters
  // This preserves the original message when it's within reasonable limits
  return message.length > 500 ? message.substring(0, 500).trim() : message
}

/**
 * Converts an unknown error into a standardized UnknownError format.
 *
 * This function takes any unknown error and transforms it into a consistent
 * structure for better error handling and debugging. It also sanitizes error
 * messages to prevent HTML content from external services from leaking to clients.
 *
 * @param {unknown} err - The error to be converted (can be Error, string, or any other type)
 * @param {string} [requestId] - Optional request ID for tracking
 * @param {string} [environment] - Optional environment name. Callers must supply
 *   this explicitly; no process.env lookup is performed so this module is safe
 *   to bundle in browser targets.
 *
 * @returns {UnknownError} A standardized error object with name, status, details, message, and stack
 */
export const toUnknownErrorResponse = (
  err: unknown,
  requestId?: string,
  environment?: string,
): UnknownError => {
  const rawMessage = err instanceof Error ? err.message : String(err)
  const sanitizedMessage = sanitizeErrorMessage(rawMessage)

  const isProduction = environment === 'production'

  return {
    success: false,
    name: UNKNOWN_ERROR.name,
    status: UNKNOWN_ERROR.statusCode,
    details: UNKNOWN_ERROR.details,
    message: sanitizedMessage,
    stack: err instanceof Error && !isProduction ? err.stack : undefined,
    requestId: requestId ?? undefined,
  }
}
