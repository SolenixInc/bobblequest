import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents an "External Storage Timeout" error that occurs when an external storage service
 * (such as Google Cloud Storage) fails to respond within the expected time frame.
 *
 * This error corresponds to the HTTP status code 504 (Gateway Timeout) and indicates that the server,
 * while acting as a gateway or proxy to an external storage service, did not receive a timely response.
 * This typically happens when:
 * • Google Cloud Storage upload/download operations timeout
 * • Network latency between core-api and GCS exceeds thresholds
 * • GCS service is experiencing high load or degraded performance
 * • Resumable upload sessions expire or timeout
 *
 * Use this error when external storage operations (GCS, S3, etc.) fail due to timeout issues.
 * This error ensures that:
 * • The original timeout status (408 from GCS) is properly mapped to 504 (Gateway Timeout)
 * • HTML error bodies from external services are sanitized before being returned to clients
 * • Structured logging includes relevant context (bucket, file name, operation type)
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new ExternalStorageTimeoutError(
 *   "GCS timeout uploading file.jpg to bucket-name",
 *   "The file upload is taking longer than expected. Please try again."
 * );
 *
 * // With cause
 * throw new ExternalStorageTimeoutError(
 *   "GCS timeout uploading logo.png to org-logo-urls: Request timeout after 60s",
 *   "Unable to upload the file. Please try again in a moment.",
 *   { cause: originalGcsError }
 * );
 * ```
 */
export class ExternalStorageTimeoutError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'External Storage Timeout'
  }

  /**
   * The HTTP status code for this error.
   * Returns 504 (Gateway Timeout) as this represents a timeout from an upstream storage service.
   */
  get status(): ContentfulStatusCode {
    return 504
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'External storage service did not respond in time.'
  }
}
