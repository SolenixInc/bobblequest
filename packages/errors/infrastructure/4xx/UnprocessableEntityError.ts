import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "Unprocessable Entity" error that occurs when the server understands the content type\
 * of the request entity, but the request was unable to be processed due to semantic errors.\
 * \
 * This error corresponds to the HTTP status code 422 and indicates that the server understands the\
 * content type of the request entity, but the request was unable to be processed due to semantic errors.\
 * This typically happens when:\
 * • Business logic validation fails (invalid business rules)\
 * • Data relationships are invalid (foreign key constraints)\
 * • Workflow state prevents the operation\
 * • Complex validation rules are not satisfied\
 * • Data integrity constraints are violated\
 * • Semantic validation fails (logical inconsistencies)\
 * \
 * Use this error when the request is well-formed but contains semantic errors that prevent\
 * processing. This is different from 400 (Bad Request) - the syntax is correct but the\
 * business logic cannot process the request.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new UnprocessableEntityError("Validation failed", "Please check your input and try again.");
 *
 * // With cause
 * throw new UnprocessableEntityError("Business rule violation", "The provided data doesn't meet our requirements.", {
 *   cause: originalError
 * });
 * ```
 */
export class UnprocessableEntityError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Unprocessable Entity'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 422
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Validation failed; semantically invalid request.'
  }
}
