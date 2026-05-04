import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an error for malformed or invalid HTTP requests.\
 * \
 * This error is typically thrown when the server cannot process a request due to client-side issues.\
 * This corresponds to HTTP status code 400 and indicates that the request was malformed or contained\
 * invalid data. This typically happens when:\
 * • Request syntax is invalid (malformed JSON, XML, etc.)\
 * • Required fields are missing from the request\
 * • Data validation fails (invalid email format, out of range values)\
 * • Request headers are malformed or missing required headers\
 * • Content-Type doesn't match the request body\
 * • Query parameters are invalid or malformed\
 * \
 * Use this error when the client has sent a request that cannot be processed due to\
 * client-side issues. The client should modify their request before retrying.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new BadRequestError("Invalid JSON format", "Please check your request format and try again.");
 *
 * // With cause
 * throw new BadRequestError("Validation failed", "Please provide all required fields.", {
 *   cause: "Missing required field: email"
 * });
 * ```
 */
export class BadRequestError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Bad Request'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 400
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Malformed request (syntax, validation errors).'
  }
}
