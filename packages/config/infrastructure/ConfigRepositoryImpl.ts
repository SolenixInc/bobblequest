import type { z } from 'zod'
import type { ConfigRepository } from '../entities/ports/ConfigRepository.ts'
import { ConfigValuesSchema } from '../entities/schemas/ConfigValuesSchema.ts'
import { DbConfigSchema } from '../entities/schemas/DbConfigSchema.ts'
import {
  resolveAuthConfig,
  resolveRedisConfig,
  resolveWebsiteConfig,
} from '../entities/schemas/index.ts'
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
} from '../entities/schemas/index.ts'

type AnyZodSchema = z.ZodTypeAny

export interface ConfigRepositoryOptions {
  schema?: AnyZodSchema
}

/**
 * Implementation of ConfigRepository that reads from process.env at runtime.
 *
 * When constructed with `{ schema }`, validates only the fields that schema
 * declares — allowing web/mobile consumers to skip API-only env vars.
 */
export class ConfigRepositoryImpl implements ConfigRepository {
  private readonly _schema: AnyZodSchema

  constructor(options?: ConfigRepositoryOptions) {
    this._schema = options?.schema ?? ConfigValuesSchema
    const raw = this._buildRawForSchema(this._schema)
    this._schema.parse(raw)
  }

  private _buildRawForSchema(schema: AnyZodSchema): Record<string, unknown> {
    /* v8 ignore next */
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    const raw: Record<string, unknown> = {}

    if ('system' in shape) {
      /* v8 ignore next */
      // Handle Railway environment mapping: if RAILWAY_ENVIRONMENT_NAME is set and ENVIRONMENT is not,
      // use RAILWAY_ENVIRONMENT_NAME to derive ENVIRONMENT.
      // Railway semantics: production -> production, staging -> development (fallback),
      // development -> development
      const railwayEnv = process.env.RAILWAY_ENVIRONMENT_NAME
      const environmentFromEnv = process.env.ENVIRONMENT ?? process.env.NODE_ENV
      const environment =
        railwayEnv && !environmentFromEnv
          ? railwayEnv === 'production'
            ? 'production'
            : 'development'
          : environmentFromEnv
      raw.system = {
        environment,
        logLevel: process.env.LOG_LEVEL,
        isLocal: environment === 'local' || environment === 'development',
        port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
        aiServiceUrl: process.env.AI_SERVICE_URL,
        metricsAuthToken: process.env.METRICS_AUTH_TOKEN,
        systemApiKey: process.env.SYSTEM_API_KEY,
        cronSecret: process.env.CRON_SECRET,
        corsOrigins: process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
          : undefined,
        railwayGitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA,
        railwayEnvironmentName: process.env.RAILWAY_ENVIRONMENT_NAME,
        railwayDeploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
        railwayReplicaId: process.env.RAILWAY_REPLICA_ID,
        railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
        railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN,
      }
    }

    if ('auth' in shape) {
      raw.auth = {
        clerkPublishableKey:
          process.env.CLERK_PUBLISHABLE_KEY ??
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
          process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
        clerkSecretKey: process.env.CLERK_SECRET_KEY,
        clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,
      }
    }

    if ('analytics' in shape) {
      raw.analytics = this._buildAnalyticsRaw()
    }

    if ('posthog' in shape) {
      raw.posthog = {
        apiKey: process.env.POSTHOG_API_KEY ?? process.env.EXPO_PUBLIC_POSTHOG_KEY,
        host: process.env.POSTHOG_HOST ?? process.env.EXPO_PUBLIC_POSTHOG_HOST,
      }
    }

    if ('stripe' in shape) {
      raw.stripe = {
        apiKey: process.env.STRIPE_KEY,
        redirectDomain: process.env.STRIPE_REDIRECT_DOMAIN,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      }
    }

    if ('apple' in shape) {
      raw.apple = {
        prodUrl: process.env.APPLE_PRODUCTION_URL,
        sandboxUrl: process.env.APPLE_SANDBOX_URL,
        sharedSecret: process.env.APPLE_APP_SHARED_SECRET,
      }
    }

    if ('appStore' in shape) {
      raw.appStore = {
        bundleId: process.env.APP_STORE_BUNDLE_ID,
        environment: process.env.APP_STORE_ENVIRONMENT,
      }
    }

    if ('android' in shape) {
      raw.android = { publisherUrl: process.env.ANDROID_PUBLISHER_URL }
    }

    if ('revenueCat' in shape) {
      raw.revenueCat = {
        apiKey: process.env.CORE_REVENUE_CAT_API_KEY,
        projectId: process.env.CORE_REVENUE_CAT_PROJECT_ID,
        nutraforgeEntitlementId: process.env.CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID,
        webhookAuthHeader: process.env.REVENUECAT_WEBHOOK_AUTH_HEADER,
        appleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
        googleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
      }
    }

    if ('client' in shape) {
      raw.client = {
        trpcUrl:
          process.env.VITE_API_URL ??
          process.env.NEXT_PUBLIC_TRPC_URL ??
          process.env.EXPO_PUBLIC_API_URL,
        revenueCatPublicApiKey: process.env.VITE_REVENUECAT_PUBLIC_API_KEY,
      }
    }

    if ('website' in shape) {
      raw.website = process.env.SITE_URL ? resolveWebsiteConfig(process.env) : undefined
    }

    if ('redis' in shape) {
      raw.redis = {
        host: process.env.REDIS_HOST,
        /* v8 ignore next */
        port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT, 10) : undefined,
        password: process.env.REDIS_PASSWORD,
        url: process.env.REDIS_URL,
        tls: process.env.REDIS_TLS === 'true',
      }
    }

    if ('db' in shape) {
      if (process.env.DATABASE_URL) {
        const rawPrepare = process.env.DATABASE_PREPARE?.trim().toLowerCase()
        const prepare = rawPrepare === 'true' || rawPrepare === '1' || rawPrepare === 'yes'
        const rawMax = process.env.DATABASE_MAX_CONNECTIONS
          ? Number.parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
          : undefined
        raw.db = {
          url: process.env.DATABASE_URL,
          maxConnections: rawMax,
          prepare,
        }
      } else {
        raw.db = undefined
      }
    }

    return raw
  }

  get system(): SystemConfig {
    /* v8 ignore next */
    const schemaShape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    const systemSchema =
      'system' in schemaShape
        ? /* v8 ignore next */
          (schemaShape.system as z.ZodTypeAny)
        : ConfigValuesSchema.shape.system
    /* v8 ignore next */
    const railwayEnv = process.env.RAILWAY_ENVIRONMENT_NAME
    const environmentFromEnv = process.env.ENVIRONMENT ?? process.env.NODE_ENV
    const environment =
      railwayEnv && !environmentFromEnv
        ? railwayEnv === 'production'
          ? 'production'
          : 'development'
        : environmentFromEnv
    return systemSchema.parse({
      environment,
      logLevel: process.env.LOG_LEVEL,
      isLocal: environment === 'local' || environment === 'development',
      port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
      aiServiceUrl: process.env.AI_SERVICE_URL,
      metricsAuthToken: process.env.METRICS_AUTH_TOKEN,
      systemApiKey: process.env.SYSTEM_API_KEY,
      cronSecret: process.env.CRON_SECRET,
      corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
        : undefined,
      railwayGitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA,
      railwayEnvironmentName: process.env.RAILWAY_ENVIRONMENT_NAME,
      railwayDeploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
      railwayReplicaId: process.env.RAILWAY_REPLICA_ID,
      railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
      railwayPrivateDomain: process.env.RAILWAY_PRIVATE_DOMAIN,
    })
  }

  get posthog(): PostHogConfig {
    /* v8 ignore next */
    const shape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    const posthogSchema =
      'posthog' in shape
        ? /* v8 ignore next */
          (shape.posthog as z.ZodTypeAny)
        : ConfigValuesSchema.shape.posthog
    return posthogSchema.parse({
      apiKey: process.env.POSTHOG_API_KEY ?? process.env.EXPO_PUBLIC_POSTHOG_KEY,
      host: process.env.POSTHOG_HOST ?? process.env.EXPO_PUBLIC_POSTHOG_HOST,
    })
  }

  get analytics(): AnalyticsConfig {
    /* v8 ignore next */
    const shape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    if ('analytics' in shape) {
      // Consumer schema declares analytics: parse through its own validation
      const analyticsSchema = shape.analytics as z.ZodTypeAny
      return analyticsSchema.parse(this._buildAnalyticsRaw()) as AnalyticsConfig
    }
    // Schema-scoped consumers that don't declare analytics: return lenient result
    // (apiKey may be absent; schema default of `enabled: true` applies)
    const raw = this._buildAnalyticsRaw()
    return {
      apiKey: raw.apiKey as string,
      personalApiKey: raw.personalApiKey,
      host: raw.host,
      enabled: raw.enabled ?? true,
    }
  }

  private _buildAnalyticsRaw() {
    const rawEnabled = process.env.POSTHOG_ENABLED
    let enabled: boolean | undefined
    if (rawEnabled === undefined) {
      enabled = undefined
    } else if (rawEnabled.toLowerCase() === 'false') {
      enabled = false
    } else {
      /* v8 ignore next */
      enabled = true
    }
    return {
      apiKey: process.env.POSTHOG_API_KEY,
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      host: process.env.POSTHOG_HOST,
      enabled,
    }
  }

  get auth(): AuthConfig {
    return resolveAuthConfig(process.env)
  }

  get db(): DbConfig | undefined {
    if (!process.env.DATABASE_URL) {
      return undefined
    }
    const rawPrepare = process.env.DATABASE_PREPARE?.trim().toLowerCase()
    const prepare = rawPrepare === 'true' || rawPrepare === '1' || rawPrepare === 'yes'
    const rawMax = process.env.DATABASE_MAX_CONNECTIONS
      ? Number.parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : undefined
    return DbConfigSchema.parse({
      url: process.env.DATABASE_URL,
      maxConnections: rawMax,
      prepare,
    })
  }

  get stripe(): StripeConfig {
    return ConfigValuesSchema.shape.stripe.parse({
      apiKey: process.env.STRIPE_KEY,
      redirectDomain: process.env.STRIPE_REDIRECT_DOMAIN,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    })
  }

  get apple(): AppleConfig {
    return ConfigValuesSchema.shape.apple.parse({
      prodUrl: process.env.APPLE_PRODUCTION_URL,
      sandboxUrl: process.env.APPLE_SANDBOX_URL,
      sharedSecret: process.env.APPLE_APP_SHARED_SECRET,
    })
  }

  get appStore(): AppStoreConfig {
    return ConfigValuesSchema.shape.appStore.parse({
      bundleId: process.env.APP_STORE_BUNDLE_ID,
      environment: process.env.APP_STORE_ENVIRONMENT,
    })
  }

  get android(): AndroidConfig {
    return ConfigValuesSchema.shape.android.parse({
      publisherUrl: process.env.ANDROID_PUBLISHER_URL,
    })
  }

  get revenueCat(): RevenueCatConfig {
    /* v8 ignore next */
    const shape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    const revenueCatSchema =
      'revenueCat' in shape
        ? /* v8 ignore next */
          (shape.revenueCat as z.ZodTypeAny)
        : ConfigValuesSchema.shape.revenueCat
    return revenueCatSchema.parse({
      apiKey: process.env.CORE_REVENUE_CAT_API_KEY,
      projectId: process.env.CORE_REVENUE_CAT_PROJECT_ID,
      nutraforgeEntitlementId: process.env.CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID,
      webhookAuthHeader: process.env.REVENUECAT_WEBHOOK_AUTH_HEADER,
      appleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
      googleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
    })
  }

  /* v8 ignore start */
  get redis(): RedisConfig {
    return resolveRedisConfig(process.env)
  }

  get client() {
    /* v8 ignore next */
    const shape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    if ('client' in shape) {
      return (shape.client as z.ZodTypeAny).parse({
        trpcUrl:
          process.env.VITE_API_URL ??
          process.env.NEXT_PUBLIC_TRPC_URL ??
          process.env.EXPO_PUBLIC_API_URL,
        revenueCatPublicApiKey: process.env.VITE_REVENUECAT_PUBLIC_API_KEY,
      })
    }
    return undefined
  }

  get website(): WebsiteConfig | undefined {
    /* v8 ignore next */
    const shape = (this._schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
    if ('website' in shape) {
      return process.env.SITE_URL ? resolveWebsiteConfig(process.env) : undefined
    }
    return undefined
  }
  /* v8 ignore stop */

  getAll(): ConfigValues {
    return {
      system: this.system,
      posthog: this.posthog,
      analytics: this.analytics,
      auth: this.auth,
      stripe: this.stripe,
      apple: this.apple,
      appStore: this.appStore,
      android: this.android,
      revenueCat: this.revenueCat,
      redis: this.redis,
      db: this.db,
      client: this.client,
      website: this.website,
    }
  }
}
