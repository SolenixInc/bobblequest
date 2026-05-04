import { z } from 'zod'
import { EnvironmentSchema } from './EnvironmentSchema.ts'

/**
 * Schema for logging configuration namespace.
 *
 * Defines configuration values required to construct the application's
 * structured JSON logger (winston-based).
 *
 * **Environment Variables:**
 * - `LOG_LEVEL` - Minimum level to emit. One of: trace|debug|info|warn|error|fatal. Default: info.
 * - `LOG_SERVICE_NAME` - Service identifier included in every log line. Default: "app".
 * - `NODE_ENV` - Environment (supplied via EnvironmentSchema).
 * - `LOG_DESTINATION` - "stdout" (default) or "stderr". Reserved for future file destinations.
 * - `LOG_REDACT_EXTRA` - Optional comma-separated list of additional redaction paths.
 */
export const LoggingConfigSchema = z.object({
  /**
   * Minimum log level emitted. Any line below this level is dropped.
   */
  level: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info')
    .describe('Minimum log level emitted'),

  /**
   * Service identifier attached to every log line as `service`.
   */
  serviceName: z.string().min(1).default('app').describe('Service name attached as base binding'),

  /**
   * Deployment environment.
   */
  environment: EnvironmentSchema.describe('Deployment environment'),

  /**
   * Destination stream for log output.
   */
  destination: z
    .enum(['stdout', 'stderr'])
    .default('stdout')
    .describe('Output stream for log lines'),

  /**
   * Additional redaction paths merged with the logger's defaults.
   */
  redactExtraPaths: z
    .array(z.string().min(1))
    .optional()
    .describe('Extra logger redact paths appended to defaults'),
})

/**
 * Type inferred from LoggingConfigSchema.
 */
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>
