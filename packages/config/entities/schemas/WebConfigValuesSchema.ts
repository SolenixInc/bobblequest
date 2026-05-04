/* v8 ignore start */
import { z } from 'zod'
import { AuthConfigSchema } from './AuthConfigSchema.ts'
import { EnvironmentSchema } from './EnvironmentSchema.ts'

/**
 * Schema for web (Next.js) configuration values.
 *
 * Validates only the environment variables consumed by apps/web.
 * API-specific fields (aiServiceUrl, metricsAuthToken, systemApiKey,
 * stripe, redis, db, and mobile platform configs) are intentionally excluded.
 *
 * The `client` section covers NEXT_PUBLIC_* vars that are inlined by Next.js
 * at build time and safe to expose in browser bundles.
 *
 * Usage in apps/web composition root:
 * ```ts
 * registerConfigRepo(container, { schema: WebConfigValuesSchema })
 * ```
 */
export const WebConfigValuesSchema = z.object({
  system: z.object({
    environment: EnvironmentSchema,
    logLevel: z
      .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
      .default('debug'),
    isLocal: z.boolean(),
    port: z.number().default(8000),
  }),
  auth: AuthConfigSchema,
  client: z.object({
    trpcUrl: z.string().url().default('http://localhost:3001/trpc'),
  }),
})

export type WebConfigValues = z.infer<typeof WebConfigValuesSchema>

/**
 * Resolves web configuration from a process environment record.
 *
 * Returns only the fields declared in WebConfigValuesSchema. Intended for
 * use in ConfigRepositoryImpl._buildRawForSchema() when the consumer schema
 * is WebConfigValuesSchema.
 *
 * Note: NEXT_PUBLIC_* vars must be read as explicit property accesses before
 * passing to this function — Next.js inlines them at build time and does NOT
 * support spreading process.env through a runtime helper.
 */
/* v8 ignore start */
export function resolveWebConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): WebConfigValues {
  const environment = env.ENVIRONMENT ?? env.NODE_ENV
  return WebConfigValuesSchema.parse({
    system: {
      environment,
      logLevel: env.LOG_LEVEL,
      isLocal: environment === 'local' || environment === 'development',
      port: env.PORT ? Number.parseInt(env.PORT, 10) : undefined,
    },
    auth: {
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: env.CLERK_SECRET_KEY,
      clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
    },
    client: {
      trpcUrl: env.NEXT_PUBLIC_TRPC_URL,
    },
  })
}
/* v8 ignore stop */
