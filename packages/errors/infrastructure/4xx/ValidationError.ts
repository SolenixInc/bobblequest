import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a validation error that occurs when request data fails schema validation.\
 * \
 * This error is specifically used for Zod validation failures and other schema validation\
 * errors. It corresponds to HTTP status code 400 and indicates that the request data did\
 * not meet the expected schema requirements. This typically happens when:\
 * • Required fields are missing from the request\
 * • Field types don't match the expected schema (string vs number, etc.)\
 * • Field values are out of acceptable ranges or don't match patterns\
 * • Nested object structures don't match the expected shape\
 * • Array items don't conform to the expected item schema\
 * \
 * Use this error when request data fails Zod or other schema validation. The error\
 * includes sanitized validation details that can be safely returned to clients.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new ValidationError(
 *   "Request validation failed: email is required",
 *   "Please provide all required fields."
 * );
 *
 * // With validation details
 * throw new ValidationError(
 *   "Request validation failed",
 *   "Please check your input and try again.",
 *   {
 *     cause: {
 *       validationErrors: [
 *         { path: "email", message: "Required" },
 *         { path: "age", message: "Must be a positive number" }
 *       ]
 *     }
 *   }
 * );
 * ```
 */
export class ValidationError extends AppError {
  /**
   * The name of this error type.\
   * \
   * @returns {string} The error type name "Validation Error"
   */
  get name(): string {
    return 'Validation Error'
  }

  /**
   * The HTTP status code for this error.\
   * \
   * @returns {ContentfulStatusCode} HTTP status code 400 (Bad Request)
   */
  get status(): ContentfulStatusCode {
    return 400
  }

  /**
   * Additional details about this error type.\
   * \
   * @returns {string} Description of validation error type
   */
  get details(): string {
    return 'Request data failed schema validation.'
  }
}
