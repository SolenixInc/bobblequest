import { z } from 'zod'
import { EnvironmentSchema } from './EnvironmentSchema.ts'

/**
 * Schema for System configuration namespace.
 *
 * Defines core system-level configuration values required for the application runtime.
 *
 * **Environment Variables:**
 * - `ENVIRONMENT` - Application runtime environment (development | local | testing | production)
 * - `PORT` - The port the application should listen on (optional, default: 8000)
 * - `AI_SERVICE_URL` - URL for the internal AI service
 * - `METRICS_AUTH_TOKEN` - Token required to access the /metrics endpoint
 * - `SYSTEM_API_KEY` - Key used for internal service-to-service authentication
 * - `CORS_ORIGINS` - Comma-separated list of allowed CORS origins
 */
export const SystemConfigSchema = z.object({
  /**
   * Application runtime environment.
   *
   * One of: `development` | `local` | `testing` | `production`.
   *
   * @see {@link EnvironmentSchema}
   */
  environment: EnvironmentSchema,

  /**
   * Log level for the application.
   *
   * **Environment Variable:** `LOG_LEVEL`
   * **Default:** `debug`
   */
  logLevel: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('debug')
    .describe('Log level'),

  /**
   * Whether the application is running locally.
   *
   * Derived from `environment`: `true` when environment is `"local"` or
   * `"development"`, `false` otherwise.
   */
  isLocal: z.boolean().describe('Whether running locally'),

  /**
   * Port to listen on.
   *
   * **Environment Variable:** `PORT`
   * **Optional:** Yes
   */
  port: z.number().default(8000).describe('Port to listen on'),

  /**
   * AI Service URL.
   *
   * Endpoint for the internal AI service.
   *
   * **Environment Variable:** `AI_SERVICE_URL`
   */
  aiServiceUrl: z.string().describe('AI Service URL'),

  /**
   * Metrics Authentication Token.
   *
   * Token required to access the /metrics endpoint.
   *
   * **Environment Variable:** `METRICS_AUTH_TOKEN`
   */
  metricsAuthToken: z.string().describe('Metrics Authentication Token'),

  /**
   * System API Key.
   *
   * Key used for internal service-to-service authentication.
   *
   * **Environment Variable:** `SYSTEM_API_KEY`
   */
  systemApiKey: z.string().describe('System API Key'),

  /**
   * Allowed CORS origins.
   *
   * **Environment Variable:** `CORS_ORIGINS`
   * **Default:** `['http://localhost:3000', 'http://localhost:8081']`
   */
  corsOrigins: z
    .array(z.string())
    .default(['http://localhost:3000', 'http://localhost:8081'])
    .describe('Allowed CORS origins'),

  /**
   * Cron Secret.
   *
   * Token required to trigger cron endpoints via HTTP.
   *
   * **Environment Variable:** `CRON_SECRET`
   */
  cronSecret: z.string().describe('Cron Secret'),
})

/**
 * Type inferred from SystemConfigSchema.
 */
export type SystemConfig = z.infer<typeof SystemConfigSchema>
