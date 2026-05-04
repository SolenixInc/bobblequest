/**
 * Pure helper — builds the Authorization header from a resolved Clerk token.
 * Lives in its own module so it can be unit-tested without any Expo/RN runtime.
 */
export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {}
}
