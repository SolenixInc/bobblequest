import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Conflict" error that occurs when a request could not be completed due to a conflict\
 * with the current state of the resource.\
 * \
 * This error corresponds to the HTTP status code 409 and indicates that the request conflicts with\
 * the current state of the resource. This typically happens when:\
 * • Attempting to create a resource that already exists (duplicate email, username)\
 * • Updating a resource that has been modified by another process\
 * • Concurrent modifications create conflicting states\
 * • Business rules prevent the requested operation\
 * • Resource dependencies create conflicts\
 * • Version conflicts in optimistic locking scenarios\
 * \
 * Use this error when the request cannot be completed due to a conflict with the current\
 * state of the resource. The client should resolve the conflict before retrying.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new ConflictError("Email already exists", "An account with this email already exists. Please use a different email.");
 *
 * // With cause
 * throw new ConflictError("Duplicate resource", "This resource already exists. Please try a different name.", {
 *   cause: originalError
 * });
 * ```
 */
export class ConflictError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Conflict'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 409
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Request conflicts with current state (e.g., duplicate record).'
  }
}
