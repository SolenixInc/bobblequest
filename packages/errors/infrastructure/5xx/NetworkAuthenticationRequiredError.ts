import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../../entities/ports/AppError.ts'

/**
 * Represents a "Network Authentication Required" error that occurs when the client needs to authenticate\
 * to gain network access.\
 * \
 * This error corresponds to the HTTP status code 511 and indicates that the client needs to authenticate\
 * to gain network access (e.g., captive portal). This typically happens when:\
 * • A captive portal requires authentication before internet access\
 * • Network-level authentication is required (corporate networks)\
 * • ISP requires login before service access\
 * • Public WiFi networks require terms acceptance\
 * • Network firewalls require authentication\
 * • VPN or proxy authentication is needed\
 * \
 * Use this error when network-level authentication is required before the client can access\
 * your service. This is different from application-level authentication (401 Unauthorized).
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new NetworkAuthenticationRequiredError("Captive portal detected", "Please authenticate with the network to continue.");
 *
 * // With cause
 * throw new NetworkAuthenticationRequiredError("Network access denied", "Authentication required to access this network.", {
 *   cause: originalError
 * });
 * ```
 */
export class NetworkAuthenticationRequiredError extends AppError {
  /**
   * The name of this error type.
   */
  get name(): string {
    return 'Network Authentication Required'
  }

  /**
   * The HTTP status code for this error.
   */
  get status(): ContentfulStatusCode {
    return 511
  }

  /**
   * Additional details about this error type.
   */
  get details(): string {
    return 'Client needs to authenticate to network (e.g., captive portal).'
  }
}
