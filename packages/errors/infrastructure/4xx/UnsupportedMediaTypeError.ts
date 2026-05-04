import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "Unsupported Media Type" error that occurs when the server refuses to accept the request\
 * because the payload format is not supported.\
 * \
 * This error corresponds to the HTTP status code 415 and indicates that the payload format is not\
 * supported (e.g., sending XML to JSON API). This typically happens when:\
 * • Content-Type header specifies an unsupported media type\
 * • Request body format doesn't match the expected format\
 * • API only accepts specific content types (JSON, XML, etc.)\
 * • File upload format is not supported\
 * • Content encoding is not supported\
 * • Media type version is not compatible\
 * \
 * Use this error when the client sends a request with an unsupported media type. The client\
 * should check the API documentation for supported content types and adjust their request accordingly.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new UnsupportedMediaTypeError("Content-Type not supported", "Please send your request in a supported format (JSON).");
 *
 * // With cause
 * throw new UnsupportedMediaTypeError("XML payload rejected", "This endpoint only accepts JSON format.", {
 *   cause: originalError
 * });
 * ```
 */
export class UnsupportedMediaTypeError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Unsupported Media Type'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 415
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Payload format not supported (e.g., sending XML to JSON API).'
  }
}
