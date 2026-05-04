import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Abstract base class for application-specific errors with standardized error handling.
 *
 * This class extends the native Error class to provide a consistent interface for
 * application errors across the system. It enforces a pattern where extending classes
 * must define static fields for error metadata, ensuring consistency and type safety.
 *
 * ## Key Features:
 * - **Static Field Requirements**: Extending classes must define `name`, `status`, and `details` as static readonly fields
 * - **HTTP Status Integration**: Built-in support for HTTP status codes using ContentfulStatusCode
 * - **Structured Error Information**: Standardized error details and response messages
 * - **Cause Chain Support**: Native support for error cause chains via the Error constructor
 * - **Type Safety**: Full TypeScript support with proper typing for all error properties
 *
 * ## Usage Pattern:
 * ```typescript
 * export class MyCustomError extends AppError {
 *   static override readonly name = "My Custom Error";
 *   static readonly status = 400 as ContentfulStatusCode;
 *   static readonly details = "Detailed description of this error type";
 *
 *   constructor(message: string, opt?: { cause?: unknown }, stack?: string) {
 *     super(message, opt, stack);
 *   }
 * }
 * ```
 *
 * ## Error Hierarchy:
 * This class serves as the foundation for all application errors, providing a consistent
 * structure for error handling, logging, and API responses throughout the system.
 *
 * @abstract
 * @extends Error
 */

export abstract class AppError extends Error {
  /**
   * The error message inherited from the Error class.
   * This is set by the constructor and contains the developer-focused error message.
   */
  declare message: string

  /**
   * Abstract method that must be implemented by all extending classes.
   *
   * Defines the human-readable name/type of the error. This should be a descriptive
   * string that clearly identifies the error category (e.g., "Bad Request", "Not Found",
   * "Internal Server Error"). This name is used for logging, debugging, and API responses.
   *
   * @example
   * ```typescript
   * get name(): string {
   *   return "Bad Request";
   * }
   * ```
   *
   * @abstract
   */
  abstract override get name(): string

  /**
   * Abstract method that must be implemented by all extending classes.
   *
   * Defines the HTTP status code associated with this error type. This should be a
   * valid HTTP status code that accurately represents the error condition. The status
   * code is used for API responses and error handling middleware.
   *
   * @example
   * ```typescript
   * get status(): ContentfulStatusCode {
   *   return 400;
   * }
   * ```
   *
   * @abstract
   */
  abstract get status(): ContentfulStatusCode

  /**
   * Abstract method that must be implemented by all extending classes.
   *
   * Provides additional context and details about the error type. This should be a
   * descriptive string that explains what the error means, when it occurs, and potentially
   * how to resolve it. This information is used for logging, debugging, and developer
   * documentation.
   *
   * @example
   * ```typescript
   * get details(): string {
   *   return "The request was malformed or contained invalid data";
   * }
   * ```
   *
   * @abstract
   */
  abstract get details(): string

  /**
   *  user-friendly response message for API consumers and UIs.
   *
   * This property provides a sanitized, user-friendly error message that is safe
   * to display to end users. This message should not contain sensitive information
   * or implementation details and must be suitable for display in user interfaces.
   *
   * @example
   * ```typescript
   * // In your error class
   * static readonly responseMessage = "Please check your input and try again";
   * ```
   *
   * @readonly
   */
  public readonly responseMessage: string

  /**
   * The file name where the error occurred.
   */
  public readonly fileName?: string

  /**
   * Additional metadata providing context about the error.
   */
  public readonly metadata?: Record<string, unknown>

  /**
   * Creates a new AppError instance with standardized error handling.
   *
   * This constructor initializes the error with the provided message and optional
   * configuration. The static fields defined in the extending class are automatically
   * used to populate the instance properties, ensuring consistency across all error types.
   *
   * @param {string} message - **Developer-focused** error message describing what went wrong. This should be specific to the error instance and contain technical details for debugging purposes.
   * @param {string} responseMessage - user-friendly message to display in UIs. This should be a sanitized, non-technical message that is safe to show to end users. Must not contain sensitive information or implementation details.
   * @param {object} [opt] - Optional configuration object for additional error context.
   * @param {unknown} [opt.cause] - The underlying cause that triggered this error. This can be another Error, a string, or any other value that provides context about why the error occurred.
   * @param {string} [opt.fileName] - The file name where the error occurred.
   * @param {Record<string, unknown>} [opt.metadata] - Additional metadata providing context about the error.
   *
   * @example
   * ```typescript
   * // Basic usage
   * throw new MyCustomError("Something went wrong", "Please try again later");
   *
   * // With cause
   * throw new MyCustomError("Database connection failed", "Unable to connect to the server. Please try again.", {
   *   cause: originalDatabaseError
   * });
   * ```
   */
  constructor(
    message: string,
    responseMessage: string,
    opt?: {
      cause?: unknown
      fileName?: string
      metadata?: Record<string, unknown>
    },
  ) {
    super(message, { cause: opt?.cause })
    this.responseMessage = responseMessage
    this.fileName = opt?.fileName
    this.metadata = opt?.metadata
  }
}
