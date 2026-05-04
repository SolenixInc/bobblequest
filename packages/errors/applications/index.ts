/**
 * @fileoverview Exports error response transformation utilities.
 *
 * This module provides application-layer functions for transforming errors
 * into standardized error response formats. These utilities convert both
 * known application errors and unknown errors into consistent response objects.
 *
 * @module platform/errors/application
 */

export { toAppErrorResponse } from './toAppErrorResponse.ts'
export { toUnknownErrorResponse } from './toUnknownErrorResponse.ts'
