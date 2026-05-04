/**
 * @fileoverview Exports all 4xx HTTP client error classes.
 *
 * This module provides custom error classes for HTTP 4xx status codes,
 * representing client-side errors in the application.
 *
 * @module platform/errors/infrastructure/4xx
 */

export { BadRequestError } from './BadRequestError.ts'
export { UnauthorizedError } from './UnauthorizedError.ts'
export { ForbiddenError } from './ForbiddenError.ts'
export { NotFoundError } from './NotFoundError.ts'
export { ConflictError } from './ConflictError.ts'
export { TooManyRequestsError } from './TooManyRequestsError.ts'
export { UnprocessableEntityError } from './UnprocessableEntityError.ts'
export { GoneError } from './GoneError.ts'
export { MethodNotFoundError } from './MethodNotFoundError.ts'
export { PreconditionFailedError } from './PreconditionFailedError.ts'
export { RequestTimeoutError } from './RequestTimeoutError.ts'
export { UnsupportedMediaTypeError } from './UnsupportedMediaTypeError.ts'
export { ValidationError } from './ValidationError.ts'
