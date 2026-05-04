import { resolveWebClientConfig } from '@t/config/browser'
export type { WebClientConfig } from '@t/config/browser'

// NEXT_PUBLIC_* vars must be read as explicit property accesses here —
// Next.js inlines them at build time and does not support spreading
// process.env through a runtime helper.
export const webClientConfig = resolveWebClientConfig({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TRPC_URL: process.env.NEXT_PUBLIC_TRPC_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY,
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
})
