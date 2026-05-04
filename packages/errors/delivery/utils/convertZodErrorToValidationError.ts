import type { ZodError } from 'zod'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'
import { extractValidationErrors } from './extractValidationErrors.ts'

/**
 * Converts a ZodError into a ValidationError with sanitized validation details.\
 * \
 * @param zodError - The ZodError to convert
 * @returns ValidationError instance with formatted message and validation details
 */
export function convertZodErrorToValidationError(zodError: ZodError): ValidationError {
  const validationErrors = extractValidationErrors(zodError)
  const errorMessage = `Validation failed: ${validationErrors
    .map((e) => `${e.path}: ${e.message}`)
    .join(', ')}`
  return new ValidationError(errorMessage, 'Please check your input and try again.', {
    cause: { validationErrors },
  })
}
