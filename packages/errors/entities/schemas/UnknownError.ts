import type { ContentfulStatusCode } from 'hono/utils/http-status'
/**
 * Represents an unknown error that may occur during the application's execution.
 *
 * This type is used to define the structure of errors that do not fall into predefined categories.
 */
export type UnknownError = {
  /**
   * Indicates if the operation was successful.
   */
  success: boolean

  /**
   * A brief name describing the error.
   */
  name: string

  /**
   * The HTTP status code associated with the error.
   * This is optional and may not always be provided.
   */
  status?: ContentfulStatusCode

  /**
   * An Error message, providing more context for debugging or logging.
   * This is optional and can be undefined.
   */
  message?: string

  /**
   * The stack trace of the error, if available.
   * This is optional and can be undefined.
   */
  stack?: string

  /**
   * Additional details about the error, providing more context for debugging or logging.
   */
  details?: string

  /**
   * Identifier for correlating the error with a specific request.
   */
  requestId?: string
}
