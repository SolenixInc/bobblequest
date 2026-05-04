import { z } from 'zod'

/**
 * Schema for Analytics configuration namespace.
 *
 * Defines configuration values required for the analytics subsystem
 * (PostHog product analytics + server-side feature flag evaluation).
 *
 * **Environment Variables:**
 * - `POSTHOG_API_KEY` - Public PostHog Project API Key
 * - `POSTHOG_PERSONAL_API_KEY` - Server-side feature flag evaluation key
 * - `POSTHOG_HOST` - PostHog instance host URL (e.g. `https://us.i.posthog.com`)
 * - `POSTHOG_ENABLED` - Toggle analytics capture on/off (defaults to `true`)
 */
export const AnalyticsConfigSchema = z.object({
  /**
   * PostHog public Project API Key.
   *
   * Used to initialize the PostHog client for event capture.
   *
   * **Environment Variable:** `POSTHOG_API_KEY`
   */
  apiKey: z.string().min(1, 'POSTHOG_API_KEY is required').describe('PostHog Project API Key'),

  /**
   * PostHog personal API key for server-side feature flag evaluation.
   *
   * Distinct from `apiKey` — this is a user-scoped token that authorizes
   * the server to read feature flag definitions. Optional because not
   * every deployment evaluates flags server-side.
   *
   * **Environment Variable:** `POSTHOG_PERSONAL_API_KEY`
   */
  personalApiKey: z
    .string()
    .optional()
    .describe('PostHog Personal API Key for server-side flag evaluation'),

  /**
   * PostHog instance host URL.
   *
   * Region- or self-host-specific endpoint (e.g. `https://us.i.posthog.com`,
   * `https://eu.i.posthog.com`). Optional so the PostHog SDK can apply its
   * own default when unset.
   *
   * **Environment Variable:** `POSTHOG_HOST`
   */
  host: z.string().url().optional().describe('PostHog instance host URL'),

  /**
   * Whether analytics capture is enabled.
   *
   * Defaults to `true` when unset so production captures by default; set
   * `POSTHOG_ENABLED=false` in local/CI environments to suppress events.
   *
   * **Environment Variable:** `POSTHOG_ENABLED`
   */
  enabled: z.boolean().default(true).describe('Whether analytics capture is enabled'),
})

/**
 * Type inferred from AnalyticsConfigSchema.
 */
export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>

/**
 * Resolves analytics configuration from a process environment record.
 *
 * Maps the `POSTHOG_*` env vars into the shape expected by
 * {@link AnalyticsConfigSchema} and runs it through `.parse()` so schema
 * defaults and validation apply uniformly.
 *
 * Coercion rules for `POSTHOG_ENABLED`:
 * - unset → omitted (schema default of `true` applies)
 * - `"false"` (case-insensitive) → `false`
 * - any other value → `true`
 */
export function resolveAnalyticsConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AnalyticsConfig {
  const rawEnabled = env.POSTHOG_ENABLED
  let enabled: boolean | undefined
  if (rawEnabled === undefined) {
    enabled = undefined
  } else if (rawEnabled.toLowerCase() === 'false') {
    enabled = false
  } else {
    enabled = true
  }

  return AnalyticsConfigSchema.parse({
    apiKey: env.POSTHOG_API_KEY,
    personalApiKey: env.POSTHOG_PERSONAL_API_KEY,
    host: env.POSTHOG_HOST,
    enabled,
  })
}
