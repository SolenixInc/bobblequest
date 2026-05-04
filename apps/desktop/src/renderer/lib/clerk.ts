/**
 * Clerk client setup for the desktop app.
 *
 * Electron renders the app under `file://`, which breaks OAuth redirect
 * flows. We therefore use Clerk's headless email-code sign-in via the
 * `@clerk/clerk-react` SDK: the user enters an email, receives a one-time
 * code, and Clerk's client-side `signIn` resource exchanges it for an
 * active session without any redirect. The JWT returned by `getToken()`
 * is attached as a Bearer header on every tRPC request.
 */
import { desktopClientConfig } from './clientConfig'

export const CLERK_PUBLISHABLE_KEY = desktopClientConfig.clerk.publishableKey

export {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
  useClerk,
  useSignIn,
  useUser,
} from '@clerk/clerk-react'
