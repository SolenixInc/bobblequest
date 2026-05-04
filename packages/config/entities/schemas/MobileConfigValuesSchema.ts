import { z } from 'zod'
import { EnvironmentSchema } from './EnvironmentSchema.ts'
import { PostHogConfigSchema } from './PostHogConfigSchema.ts'

/**
 * Schema for mobile (Expo) configuration values.
 *
 * Validates only the environment variables consumed by apps/mobile.
 *
 * Usage in apps/mobile composition root:
 * ```ts
 * registerConfigRepo(container, { schema: MobileConfigValuesSchema })
 * ```
 */
export const MobileConfigValuesSchema = z.object({
  system: z.object({
    environment: EnvironmentSchema,
    logLevel: z
      .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
      .default('debug'),
    isLocal: z.boolean(),
  }),
  auth: z.object({
    clerkPublishableKey: z.string().min(1),
  }),
  posthog: PostHogConfigSchema.extend({
    host: z.string().url().default('https://us.i.posthog.com'),
  }).describe('PostHog analytics configuration'),
  revenueCat: z.object({
    appleApiKey: z.string().optional(),
    googleApiKey: z.string().optional(),
  }),
  client: z.object({
    trpcUrl: z.string().url().default('http://localhost:3001/trpc'),
  }),
})

export type MobileConfigValues = z.infer<typeof MobileConfigValuesSchema>

/**
 * Resolves mobile configuration from a process environment record.
 *
 * Returns only the fields declared in MobileConfigValuesSchema.
 *
 * Note: EXPO_PUBLIC_* vars must be read as explicit property accesses in Expo.
 */
export function resolveMobileConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): MobileConfigValues {
  const environment = env.ENVIRONMENT ?? env.NODE_ENV
  return MobileConfigValuesSchema.parse({
    system: {
      environment,
      logLevel: env.LOG_LEVEL,
      isLocal: environment === 'local' || environment === 'development',
    },
    auth: {
      clerkPublishableKey: env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
    posthog: {
      apiKey: env.EXPO_PUBLIC_POSTHOG_KEY,
      host: env.EXPO_PUBLIC_POSTHOG_HOST,
    },
    revenueCat: {
      appleApiKey: env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
      googleApiKey: env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
    },
    client: {
      trpcUrl: env.EXPO_PUBLIC_API_URL,
    },
  })
}
