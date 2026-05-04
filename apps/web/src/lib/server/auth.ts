import 'server-only'

/**
 * Returns true when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is present at runtime.
 *
 * Used to gate <ClerkProvider> in layout.tsx so the app boots cleanly when
 * only the publishable key is available (e.g. Docker builds that bake in the
 * public key as a build arg but do not expose CLERK_SECRET_KEY at runtime).
 * ClerkProvider is a client-side provider — it only requires the publishable
 * key, not the secret key.
 *
 * All three provider gates (layout, trpc, billing) must agree on this same
 * predicate so they consistently either all include Clerk or all skip it.
 */
export function isClerkConfiguredClient(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
}

/**
 * Returns true when CLERK_SECRET_KEY is present at runtime.
 *
 * Used to gate server-only Clerk calls (e.g. auth() in dashboard/page.tsx)
 * that require the secret key. Never use this to gate <ClerkProvider> — that
 * only needs the publishable key; use isClerkConfiguredClient() instead.
 *
 * Never import this from client components — it reads server-only env vars.
 */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY)
}
