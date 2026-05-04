import { z } from 'zod'

/**
 * Schema for PostHog configuration namespace.
 *
 * Defines configuration values required for PostHog product analytics.
 *
 * **Environment Variables:**
 * - `POSTHOG_API_KEY` - Project API Key
 * - `POSTHOG_HOST` - PostHog instance host URL
 */
export const PostHogConfigSchema = z.object({
  /**
   * PostHog API Key.
   *
   * Public API key (Project API Key) for initializing PostHog client.
   *
   * **Environment Variable:** `POSTHOG_API_KEY`
   */
  apiKey: z.string().min(1, 'POSTHOG_API_KEY is required').describe('PostHog Project API Key'),

  /**
   * PostHog Host URL.
   *
   * **Environment Variable:** `POSTHOG_HOST` or `EXPO_PUBLIC_POSTHOG_HOST`
   */
  host: z.string().url().optional().describe('PostHog instance host URL'),
})

/**
 * Type inferred from PostHogConfigSchema.
 */
export type PostHogConfig = z.infer<typeof PostHogConfigSchema>
