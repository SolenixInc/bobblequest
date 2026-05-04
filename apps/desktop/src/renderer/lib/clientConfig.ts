import { WebClientConfigSchema } from '@t/config/browser'
import type { WebClientConfig } from '@t/config/browser'

/**
 * Resolves desktop client configuration from Vite-prefixed env vars.
 *
 * Mirrors {@link resolveWebClientConfig} from `@t/config/browser` but reads
 * `VITE_*` variables injected by the Vite renderer build instead of
 * `NEXT_PUBLIC_*`.
 *
 * @param env - A plain record of env vars (typically `import.meta.env`).
 * @returns A fully-parsed `WebClientConfig` with defaults applied.
 * @throws `Error` when required fields are missing or invalid.
 */
export function resolveDesktopClientConfig(
  env: Record<string, string | undefined>,
): WebClientConfig {
  const result = WebClientConfigSchema.safeParse({
    clerk: {
      publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
    },
    trpc: {
      url: env.VITE_API_URL,
    },
    posthog: {
      key: env.VITE_POSTHOG_KEY,
      host: env.VITE_POSTHOG_HOST,
    },
    revenueCat: {
      publicApiKey: env.VITE_REVENUECAT_PUBLIC_API_KEY,
    },
    environment: env.VITE_ENVIRONMENT,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`DesktopClientConfig validation failed:\n${issues}`)
  }

  return result.data
}

/**
 * Desktop client config singleton.
 *
 * Resolved at module load time from Vite-injected `import.meta.env`.
 */
export const desktopClientConfig = resolveDesktopClientConfig({
  VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
  VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
  VITE_REVENUECAT_PUBLIC_API_KEY: import.meta.env.VITE_REVENUECAT_PUBLIC_API_KEY,
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
})
