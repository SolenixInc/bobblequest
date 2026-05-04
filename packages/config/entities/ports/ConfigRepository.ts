import type {
  AnalyticsConfig,
  AndroidConfig,
  AppStoreConfig,
  AppleConfig,
  AuthConfig,
  ConfigValues,
  DbConfig,
  PostHogConfig,
  RedisConfig,
  RevenueCatConfig,
  StripeConfig,
  SystemConfig,
  WebsiteConfig,
} from '../schemas/index.ts'

/**
 * Interface for the Configuration Repository.
 *
 * Defines the contract for accessing application configuration values.
 * Implementations should handle the retrieval of configuration from
 * various sources (e.g., environment variables, secret managers).
 */
export interface ConfigRepository {
  /**
   * System configuration settings.
   */
  readonly system: SystemConfig

  /**
   * Auth (Clerk) identity provider configuration.
   */
  readonly auth: AuthConfig

  /**
   * Postgres (Railway + pgvector) database configuration.
   *
   * Optional — absent when `DATABASE_URL` is unset (e.g. pure-test
   * environments that register in-memory repositories).
   */
  readonly db?: DbConfig

  /**
   * Stripe configuration settings.
   */
  readonly stripe: StripeConfig

  /**
   * Apple services configuration settings.
   */
  readonly apple: AppleConfig

  /**
   * App Store configuration settings.
   */
  readonly appStore: AppStoreConfig

  /**
   * Android configuration settings.
   */
  readonly android: AndroidConfig

  /**
   * PostHog configuration settings.
   */
  readonly posthog: PostHogConfig

  /**
   * Analytics (PostHog product analytics + server-side feature flags) configuration.
   */
  readonly analytics: AnalyticsConfig

  /**
   * RevenueCat configuration settings.
   */
  readonly revenueCat: RevenueCatConfig

  /**
   * Redis cache configuration settings.
   */
  readonly redis: RedisConfig

  /**
   * Client-side configuration settings (public/safe for browser).
   */
  readonly client?: {
    readonly trpcUrl?: string
    readonly revenueCatPublicApiKey?: string
  }

  /**
   * Website configuration settings.
   */
  readonly website?: WebsiteConfig

  /**
   * Retrieves all configuration values as a single object.
   */
  getAll(): ConfigValues
}
