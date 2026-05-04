import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "Insufficient Storage" error that occurs when the server is unable to store the\
 * representation needed to complete the request.\
 * \
 * This error corresponds to the HTTP status code 507 and indicates that the server is unable to\
 * store the representation needed to complete the request (WebDAV extension). This typically happens when:\
 * • Disk space is exhausted on the server\
 * • Storage quotas have been exceeded\
 * • File system permissions prevent writing\
 * • Database storage limits are reached\
 * • Cloud storage services are at capacity\
 * • Temporary storage buffers are full\
 * \
 * Use this error when the server cannot store the data required to complete the request due to\
 * storage limitations. This is a server-side resource issue, not a client request problem.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new InsufficientStorageError("Disk space exhausted", "Storage is full. Please contact support.");
 *
 * // With cause
 * throw new InsufficientStorageError("File upload failed", "Unable to store your file. Please try again later.", {
 *   cause: originalError
 * });
 * ```
 */
export class InsufficientStorageError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Insufficient Storage'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 507
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return "Server can't store representation (WebDAV)."
  }
}
