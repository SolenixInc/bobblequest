import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Represents the options for configuring an application error.
 *
 * This schema defines the structure of the options that can be passed when creating an instance of an application error.
 * It includes details such as the error name, HTTP status code, stack trace, additional details, and a response message.
 */
export type AppErrorOptions = {
  /**
   * The name of the error.
   */
  name: string

  /**
   * The HTTP status code associated with the error.
   * This is optional and defaults to a relevant status code if not provided.
   */
  status?: ContentfulStatusCode

  /**
   * The stack trace of the error, useful for debugging purposes.
   * This is optional and can be undefined.
   */
  stack?: string | undefined

  /**
   * Additional details about the error, providing more context for debugging or logging.
   */
  details?: string

  /**
   * A user-friendly response message that can be used in frontend.
   */
  responseMessage?: string
}
