import { z } from 'zod'

/**
 * Schema for environment configuration value.
 *
 * Defines the runtime environment in which the application is executing. \
 * This value is read from the `ENVIRONMENT` environment variable and defaults \
 * to "development" if not specified.
 *
 * **Valid Values:**
 * - `"development"` - Development environment with debugging enabled
 * - `"local"` - Local development environment
 * - `"testing"` - Automated test environment (forces no-op adapters)
 * - `"production"` - Production environment with optimizations enabled
 *
 * **Environment Variable:** `ENVIRONMENT`
 *
 * **Default:** `"development"`
 *
 * @example
 * ```typescript
 * const env = EnvironmentSchema.parse(process.env.ENVIRONMENT);
 * // Returns: "development" | "local" | "testing" | "production"
 * ```
 */
export const EnvironmentSchema = z
  .preprocess(
    /* v8 ignore next */
    (val) => (val === 'test' ? 'testing' : val),
    z.enum(['development', 'local', 'testing', 'production']),
  )
  .default('development')

/**
 * Type inferred from EnvironmentSchema.
 *
 * Represents the valid environment values: "development" | "local" | "testing" | "production"
 */
export type Environment = z.infer<typeof EnvironmentSchema>
