/**
 * @fileoverview Exports error handling middleware and utilities for the delivery layer.
 *
 * This module provides the error handler middleware that processes and formats
 * errors at the HTTP delivery layer, ensuring consistent error responses across
 * all API endpoints, plus the supporting utilities so callers can use them
 * directly without deep imports.
 *
 * @module platform/errors/delivery
 */

export { errorHandler } from './errorHandler.ts'
export type { ErrorWithStatusCode } from './types/ErrorWithStatusCode.ts'
export { buildErrorMetadata } from './utils/buildErrorMetadata.ts'
export { convertZodErrorToValidationError } from './utils/convertZodErrorToValidationError.ts'
export { determineStatusCode } from './utils/determineStatusCode.ts'
export { extractValidationErrors } from './utils/extractValidationErrors.ts'
export { getErrorCategory } from './utils/getErrorCategory.ts'
export { getLogLevel } from './utils/getLogLevel.ts'
export { hasStatusCode } from './utils/hasStatusCode.ts'
export { logErrorAtAppropriateLevel } from './utils/logErrorAtAppropriateLevel.ts'
