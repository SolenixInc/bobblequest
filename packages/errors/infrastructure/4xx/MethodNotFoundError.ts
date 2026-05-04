import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Method Not Found" error that occurs when the requested HTTP method is not supported\
 * by the server for the targeted resource.\
 * \
 * This error corresponds to the HTTP status code 405 and indicates that the HTTP method is not\
 * supported for this resource. This typically happens when:\
 * • The endpoint exists but doesn't support the requested HTTP method\
 * • Only specific methods are allowed (GET, POST, PUT, DELETE, etc.)\
 * • The method is disabled for security reasons\
 * • API versioning restricts certain methods\
 * • Resource state doesn't allow the requested method\
 * • Method is not implemented for this specific endpoint\
 * \
 * Use this error when the client uses an HTTP method that is not supported by the endpoint.\
 * The client should use a different HTTP method or check the allowed methods for the resource.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new MethodNotFoundError("DELETE method not supported", "This resource doesn't support the requested operation.");
 *
 * // With cause
 * throw new MethodNotFoundError("Unsupported HTTP method", "The requested method is not allowed for this endpoint.", {
 *   cause: originalError
 * });
 * ```
 */
export class MethodNotFoundError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Method Not Allowed'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 405
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'HTTP method not supported for this resource.'
  }
}
