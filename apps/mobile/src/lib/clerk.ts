import { dependencyKeys } from '@t/dependency-injection'
import { getContainer } from './composition'

/**
 * Clerk client setup for the mobile app.
 *
 * The Clerk Expo SDK (`@clerk/clerk-expo`) is used here — it re-exports the
 * same primitives as `@clerk/clerk-react` used on web/desktop but ships the
 * `tokenCache` prop on `<ClerkProvider />` that React Native requires.
 * Protection is enforced with `<SignedIn />` / `<SignedOut />` guards and
 * tRPC requests are authenticated via a Bearer token returned by `getToken()`.
 *
 * `tokenCache` is sourced from `@clerk/clerk-expo/token-cache` — the canonical
 * built-in that wraps expo-secure-store with the same error-handling semantics,
 * removing the need for a hand-rolled implementation.
 */
export const getClerkPublishableKey = (): string => {
  const container = getContainer()
  const config = container.resolve(dependencyKeys.global.CONFIG)
  return config.auth.clerkPublishableKey
}

export { tokenCache } from '@clerk/clerk-expo/token-cache'

export {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
  useUser,
} from '@clerk/clerk-expo'
