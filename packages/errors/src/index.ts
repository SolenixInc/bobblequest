/**
 * @t/errors
 *
 * Minimal, dependency-free error + result primitives shared across the monorepo.
 */

/**
 * Discriminated union representing the outcome of a fallible operation.
 *
 * - `{ ok: true, value }` on success
 * - `{ ok: false, error }` on failure
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Application error carrying a machine-readable `code`, a human-readable
 * `message`, and an HTTP-friendly `statusCode`.
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(code: string, message: string, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode

    // Restore prototype chain for extension of built-in Error.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Wraps a success value in an `ok` Result.
 */
export function ok<T>(v: T): Result<T, never> {
  return { ok: true, value: v }
}

/**
 * Wraps an error value in an `err` Result.
 */
export function err<T>(e: T): Result<never, T> {
  return { ok: false, error: e }
}

const api = { AppError, ok, err }
export default api
