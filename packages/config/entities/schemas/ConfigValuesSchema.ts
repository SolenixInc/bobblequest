import { z } from 'zod'
import { AnalyticsConfigSchema } from './AnalyticsConfigSchema.ts'
import { AndroidConfigSchema } from './AndroidConfigSchema.ts'
import { AppStoreConfigSchema } from './AppStoreConfigSchema.ts'
import { AppleConfigSchema } from './AppleConfigSchema.ts'
import { AuthConfigSchema } from './AuthConfigSchema.ts'
import { DbConfigSchema } from './DbConfigSchema.ts'
import { PostHogConfigSchema } from './PostHogConfigSchema.ts'
import { RedisConfigSchema } from './RedisConfigSchema.ts'
import { RevenueCatConfigSchema } from './RevenueCatConfigSchema.ts'
import { StripeConfigSchema } from './StripeConfigSchema.ts'
import { SystemConfigSchema } from './SystemConfigSchema.ts'
import { WebsiteConfigSchema } from './WebsiteConfigSchema.ts'

/**
 * Schema for complete configuration values structure.
 *
 * Defines the complete application configuration schema, including all \
 * top-level configuration values and namespaced configuration groups. This \
 * schema validates the entire configuration object that can be retrieved \
 * from the ConfigRepository.
 */
export const ConfigValuesSchema = z.object({
  /**
   * System-level configuration.
   * Groups environment, port, database, and flag settings.
   */
  system: SystemConfigSchema,

  /**
   * PostHog analytics configuration.
   * Groups API key and host settings.
   */
  posthog: PostHogConfigSchema.describe('PostHog analytics configuration'),
  analytics: AnalyticsConfigSchema.describe('Analytics (PostHog) configuration'),

  // Namespaced configs matching ConfigImpl groups

  /**
   * Auth (Clerk) configuration.
   */
  auth: AuthConfigSchema.describe('Auth (Clerk) identity provider configuration'),

  /**
   * Stripe payments configuration.
   */
  stripe: StripeConfigSchema,

  /**
   * Apple services configuration (legacy/shared).
   */
  apple: AppleConfigSchema,

  /**
   * App Store configuration (IAP).
   */
  appStore: AppStoreConfigSchema,

  /**
   * Android configuration.
   */
  android: AndroidConfigSchema,

  /**
   * RevenueCat configuration.
   */
  revenueCat: RevenueCatConfigSchema,

  /**
   * Redis cache configuration.
   */
  redis: RedisConfigSchema.describe('Redis cache configuration'),

  /**
   * Postgres (Railway + pgvector) database configuration.
   * Consumed by `@t/db`'s `registerDbDI`.
   */
  db: DbConfigSchema.optional().describe('Postgres database configuration (Railway + pgvector)'),

  /**
   * Website (apps/website) configuration.
   */
  website: WebsiteConfigSchema.optional().describe('Website configuration'),

  /**
   * Client-side configuration (safe for browser/renderer bundles).
   */
  client: z
    .object({
      trpcUrl: z.string().url().optional(),
      revenueCatPublicApiKey: z.string().optional(),
    })
    .optional()
    .describe('Client-side configuration'),
})

/**
 * Type inferred from ConfigValuesSchema.
 *
 * Represents the complete application configuration object with all \
 * top-level values and namespaced configuration groups.
 */
export type ConfigValues = z.infer<typeof ConfigValuesSchema>
