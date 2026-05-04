import { z } from 'zod'
import { AuthConfigSchema } from './AuthConfigSchema.ts'
import { EnvironmentSchema } from './EnvironmentSchema.ts'
import { PostHogConfigSchema } from './PostHogConfigSchema.ts'

/**
 * Schema for desktop (Electron/Tauri) configuration values.
 *
 * Validates only the environment variables consumed by apps/desktop.
 * API-specific fields (aiServiceUrl, metricsAuthToken, systemApiKey,
 * stripe, redis, db, and mobile platform configs) are intentionally excluded.
 *
 * Usage in apps/desktop composition root:
 * ```ts
 * registerConfigRepo(container, { schema: DesktopConfigValuesSchema })
 * ```
 */
export const DesktopConfigValuesSchema = z.object({
  system: z.object({
    environment: EnvironmentSchema,
    logLevel: z
      .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
      .default('debug'),
    isLocal: z.boolean(),
    port: z.number().default(8000),
  }),
  auth: AuthConfigSchema,
  posthog: PostHogConfigSchema.extend({
    host: z.string().url().default('https://us.i.posthog.com'),
  }).describe('PostHog analytics configuration — POSTHOG_API_KEY or VITE_POSTHOG_KEY required'),
  client: z
    .object({
      trpcUrl: z.string().url().default('http://localhost:3001/trpc'),
      revenueCatPublicApiKey: z.string().optional(),
    })
    .default({}),
})

export type DesktopConfigValues = z.infer<typeof DesktopConfigValuesSchema>

/**
 * Resolves desktop configuration from a process environment record.
 *
 * Accepts both main-process env vars (CLERK_PUBLISHABLE_KEY) and
 * renderer-injected Vite-prefixed vars (VITE_CLERK_PUBLISHABLE_KEY),
 * preferring the explicit main-process form.
 *
 * Returns only the fields declared in DesktopConfigValuesSchema. Intended for
 * use in ConfigRepositoryImpl._buildRawForSchema() when the consumer schema
 * is DesktopConfigValuesSchema.
 */
export function resolveDesktopConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): DesktopConfigValues {
  const environment = env.ENVIRONMENT ?? env.NODE_ENV
  return DesktopConfigValuesSchema.parse({
    system: {
      environment,
      logLevel: env.LOG_LEVEL,
      isLocal: environment === 'local' || environment === 'development',
      port: env.PORT ? Number.parseInt(env.PORT, 10) : undefined,
    },
    auth: {
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: env.CLERK_SECRET_KEY,
      clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
    },
    posthog: {
      apiKey: env.POSTHOG_API_KEY || env.VITE_POSTHOG_KEY,
      host: env.POSTHOG_HOST || env.VITE_POSTHOG_HOST,
    },
    client: {
      trpcUrl: env.VITE_API_URL,
      revenueCatPublicApiKey: env.VITE_REVENUECAT_PUBLIC_API_KEY,
    },
  })
}
