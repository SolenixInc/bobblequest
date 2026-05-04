import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Too Many Requests" error that occurs when the client has sent too many requests\
 * in a given amount of time, exceeding the server's rate limit.\
 * \
 * This error corresponds to the HTTP status code 429 and indicates that the client has sent\
 * too many requests in a given amount of time. This typically happens when:\
 * • Rate limiting policies are exceeded (requests per minute/hour)\
 * • API quotas have been reached for the current billing period\
 * • DDoS protection mechanisms are triggered\
 * • User-specific rate limits are exceeded\
 * • IP-based throttling is applied\
 * • Burst capacity limits are reached\
 * \
 * Use this error when the client has exceeded rate limits or quotas. The client should\
 * wait before making additional requests or upgrade their plan if quotas are the issue.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new TooManyRequestsError("Rate limit exceeded", "Too many requests. Please wait a moment before trying again.");
 *
 * // With cause
 * throw new TooManyRequestsError("API quota exceeded", "You've reached your request limit. Please try again later.", {
 *   cause: originalError
 * });
 * ```
 */
export class TooManyRequestsError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Too Many Requests'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 429
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Rate limit exceeded.'
  }
}
