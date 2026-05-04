import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "Internal Server Error" that occurs when the server encounters an unexpected condition\
 * that prevents it from fulfilling the request.\
 * \
 * This error corresponds to the HTTP status code 500 and indicates that the server encountered an\
 * unexpected condition that prevented it from fulfilling the request. This is a generic error used when:\
 * • An unhandled exception occurs in the application code\
 * • Database operations fail unexpectedly\
 * • Configuration errors prevent proper operation\
 * • Third-party service integrations fail without specific error handling\
 * • Application logic encounters an unexpected state\
 * \
 * Use this error as a catch-all for server-side issues that don't fit into more specific error categories.\
 * It should be used when the server is at fault, not the client request.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new InternalServerError("Database connection failed", "An unexpected error occurred. Please try again later.");
 *
 * // With cause
 * throw new InternalServerError("Unexpected server error", "Something went wrong on our end. Please try again.", {
 *   cause: originalError
 * });
 * ```
 */
export class InternalServerError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Internal Server Error'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 500
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Generic unexpected server failure.'
  }
}
