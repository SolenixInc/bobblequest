import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'

/**
 * Determines the error category based on status code and error type.\
 * \
 * @param statusCode - HTTP status code
 * @param error - The error instance
 * @returns Error category string for logging and observability
 */
export function getErrorCategory(statusCode: number, error: Error): string {
  if (error instanceof ValidationError) return 'validation_zod'
  if (statusCode === 401) return 'authentication'
  if (statusCode === 404) return 'not_found'
  if (statusCode >= 500) return 'server_error'
  if (statusCode >= 400) return 'client_error'
  return 'unknown'
}
