/**
 * Stable, machine-readable reason codes for auth failures. Surface callers
 * (tRPC, REST, GraphQL) map these to transport-appropriate errors (401, etc.).
 */
export type AuthErrorCode =
  | 'TOKEN_MISSING'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_TAMPERED'
  | 'UNAUTHORIZED_PARTY'
  | 'USER_NOT_FOUND'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_EVENT_UNSUPPORTED'
  | 'PROVIDER_ERROR'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options)
    this.code = code
    this.name = 'AuthError'
  }
}
