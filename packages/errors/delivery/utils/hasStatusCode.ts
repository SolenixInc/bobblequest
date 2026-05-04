import type { ErrorWithStatusCode } from '../types/ErrorWithStatusCode.ts'

/**
 * Type guard to check if an error has a statusCode property.
 *
 * @param error - The error to check
 * @returns True if the error has a statusCode property
 */
export function hasStatusCode(error: unknown): error is ErrorWithStatusCode {
  return error instanceof Error && 'statusCode' in error
}
