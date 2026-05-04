import { z } from 'zod'
import { EnvironmentSchema } from './EnvironmentSchema.ts'

/**
 * Schema for browser-side (client-only) configuration values.
 *
 * Validates NEXT_PUBLIC_* environment variables consumed exclusively by
 * browser bundles in apps/web (and any future client app). Contains NO
 * server secrets and MUST NOT import `server-only` or any module that
 * transitively imports it.
 *
 * Fields:
 * - `clerk.publishableKey`   — Clerk NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (optional; absent/empty → auth UI disabled, mirrors layout.tsx isClerkConfigured() gate)
 * - `trpc.url`               — tRPC base URL (optional; defaults to http://localhost:3000/trpc for dev)
 * - `posthog.key`            — PostHog project API key (optional; empty string treated as absent)
 * - `posthog.host`           — PostHog instance host (optional, defaults to us.i.posthog.com)
 * - `revenueCat.publicApiKey`— RevenueCat public key (optional; absent → NoOp tracker)
 * - `environment`            — Runtime environment (optional, defaults to 'development')
 *
 * Usage (apps/web src/lib/clientConfig.ts):
 * ```ts
 * import { resolveWebClientConfig } from '@t/config'
 *
 * export const webClientConfig = resolveWebClientConfig({
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
 *   NEXT_PUBLIC_TRPC_URL:              process.env.NEXT_PUBLIC_TRPC_URL,
 *   NEXT_PUBLIC_POSTHOG_KEY:           process.env.NEXT_PUBLIC_POSTHOG_KEY,
 *   NEXT_PUBLIC_POSTHOG_HOST:          process.env.NEXT_PUBLIC_POSTHOG_HOST,
 *   NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY,
 *   NEXT_PUBLIC_ENVIRONMENT:           process.env.NEXT_PUBLIC_ENVIRONMENT,
 * })
 * ```
 *
 * Note: NEXT_PUBLIC_* vars must be read as explicit property accesses before
 * passing to this function — Next.js inlines them at build time and does NOT
 * support spreading process.env through a runtime helper.
 */
export const WebClientConfigSchema = z.object({
  clerk: z.object({
    publishableKey: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .describe(
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — absent/empty → auth UI disabled (mirrors layout.tsx isClerkConfigured() gate)',
      ),
  }),
  trpc: z.object({
    url: z
      .string()
      .url('trpc.url must be a valid URL')
      .default('http://localhost:3000/trpc')
      .describe('NEXT_PUBLIC_TRPC_URL'),
  }),
  posthog: z.object({
    key: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .describe('NEXT_PUBLIC_POSTHOG_KEY — absent/empty → undefined'),
    host: z
      .string()
      .url('posthog.host must be a valid URL')
      .optional()
      .default('https://us.i.posthog.com')
      .describe('NEXT_PUBLIC_POSTHOG_HOST'),
  }),
  revenueCat: z
    .object({
      publicApiKey: z
        .string()
        .optional()
        .transform((v) => (v === '' ? undefined : v))
        .describe('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY — absent/empty → NoOp tracker'),
    })
    .default({}),
  environment: EnvironmentSchema.default('development'),
})

/**
 * Parsed browser-side configuration type.
 */
export type WebClientConfig = z.infer<typeof WebClientConfigSchema>

/**
 * Resolves browser-side configuration from an env record.
 *
 * Parses `WebClientConfigSchema` and throws a descriptive `Error` when
 * required fields are missing or invalid. The error message lists every
 * failing field with its Zod issue path and message, matching the pattern
 * used by other `resolveX` functions in this package.
 *
 * @param env - A plain `Record<string, string | undefined>` of env vars.
 *   Typically built from explicit `process.env.NEXT_PUBLIC_*` accesses in
 *   the app composition root (`src/lib/clientConfig.ts`).
 * @returns A fully-parsed `WebClientConfig` with defaults applied.
 * @throws `Error` when any field fails its constraint (e.g. trpc.url is present but not a valid URL).
 */
export function resolveWebClientConfig(env: Record<string, string | undefined>): WebClientConfig {
  const result = WebClientConfigSchema.safeParse({
    clerk: {
      publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
    trpc: {
      url: env.NEXT_PUBLIC_TRPC_URL,
    },
    posthog: {
      key: env.NEXT_PUBLIC_POSTHOG_KEY,
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
    },
    revenueCat: {
      publicApiKey: env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY,
    },
    environment: env.NEXT_PUBLIC_ENVIRONMENT,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`WebClientConfig validation failed:\n${issues}`)
  }

  return result.data
}
