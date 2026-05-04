import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Not Found" error that occurs when a requested resource cannot be found.\
 * \
 * This error is typically used to indicate that the client has made a valid request, but the resource\
 * they are trying to access does not exist. It corresponds to the HTTP status code 404 and indicates\
 * that the requested resource could not be found. This typically happens when:\
 * • The requested URL or endpoint doesn't exist\
 * • A specific resource ID doesn't exist in the database\
 * • A file or document has been deleted or moved\
 * • The resource exists but is not accessible to the current user\
 * • API versioning issues (endpoint exists in different version)\
 * • Typo in the resource identifier or URL\
 * \
 * Use this error when the client requests a resource that doesn't exist or cannot be found.\
 * The client should verify the resource identifier or URL before retrying.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new NotFoundError("User not found", "The requested resource could not be found.");
 *
 * // With cause
 * throw new NotFoundError("Database record missing", "The item you're looking for doesn't exist.", {
 *   cause: originalError
 * });
 * ```
 */
export class NotFoundError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Not Found'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 404
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return "Resource doesn't exist."
  }
}
