/**
 * @fileoverview Exports all 5xx HTTP server error classes.
 *
 * This module provides custom error classes for HTTP 5xx status codes,
 * representing server-side errors in the application.
 *
 * @module platform/errors/infrastructure/5xx
 */

export { InternalServerError } from './InternalServerError.ts'
export { NotImplementedError } from './NotImplementedError.ts'
export { BadGatewayError } from './BadGatewayError.ts'
export { ServiceUnavailableError } from './ServiceUnavailableError.ts'
export { GatewayTimeoutError } from './GatewayTimeoutError.ts'
export { ExternalStorageTimeoutError } from './ExternalStorageTimeoutError.ts'
export { InsufficientStorageError } from './InsufficientStorageError.ts'
export { NetworkAuthenticationRequiredError } from './NetworkAuthenticationRequiredError.ts'
