import type { ZodError } from 'zod'

/**
 * Extracts sanitized validation errors from a ZodError.\
 * \
 * @param zodError - The ZodError instance
 * @returns Array of sanitized validation error objects
 */
export function extractValidationErrors(
  zodError: ZodError,
): Array<{ path: string; message: string }> {
  return zodError.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}
