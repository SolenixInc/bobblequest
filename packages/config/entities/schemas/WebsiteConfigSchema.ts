import { z } from 'zod'

/**
 * Schema for website (apps/website) configuration namespace.
 *
 * Validates only the environment variables consumed by apps/website.
 *
 * **Environment Variables:**
 * - `SITE_URL` - Canonical URL of the deployed website (e.g. `https://example.com`)
 * - `NEXT_PUBLIC_POSTHOG_KEY` - PostHog Project API Key (public, client-side)
 * - `NEXT_PUBLIC_POSTHOG_HOST` - PostHog instance host URL
 */
export const WebsiteConfigSchema = z.object({
  /**
   * Canonical URL for the website deployment.
   *
   * Used for Open Graph metadata, sitemap generation, and canonical link tags.
   *
   * **Environment Variable:** `SITE_URL`
   */
  siteUrl: z.string().url().describe('Canonical URL of the deployed website'),

  /**
   * PostHog analytics configuration.
   *
   * Optional — missing/empty NEXT_PUBLIC_POSTHOG_KEY → NoOp tracker (no events captured).
   * Enabled only when a real phc_* key is present. This allows apps/website to boot with
   * placeholder env vars (template-repo scaffold pattern).
   */
  posthog: z.object({
    /**
     * PostHog public Project API Key.
     *
     * Optional — empty string treated as absent, analytics disabled.
     *
     * **Environment Variable:** `NEXT_PUBLIC_POSTHOG_KEY`
     */
    apiKey: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .describe('PostHog Project API Key — absent/empty → disabled'),

    /**
     * PostHog instance host URL.
     *
     * **Environment Variable:** `NEXT_PUBLIC_POSTHOG_HOST`
     */
    host: z.string().url().optional().describe('PostHog instance host URL'),

    /**
     * Whether analytics capture is enabled.
     *
     * Defaults to `true` but overridden to `false` when apiKey is absent.
     */
    enabled: z.boolean().default(true).describe('Whether analytics capture is enabled'),
  }),
})

export type WebsiteConfig = z.infer<typeof WebsiteConfigSchema>

/**
 * Resolves website configuration from a process environment record.
 *
 * Returns `undefined` when `SITE_URL` is absent AND `SKIP_ENV_VALIDATION` is not set.
 * When `SKIP_ENV_VALIDATION=1` (build-time), returns a permissive stub so that
 * `next build` static collection succeeds without real env vars present.
 * Real validation runs at first request via the lazy `getConfig()` call in
 * `apps/website/src/lib/composition.ts` (protected by `await connection()`).
 *
 * Throws when `SITE_URL` is present but invalid (not a URL).
 * `NEXT_PUBLIC_POSTHOG_KEY` is optional — absent/empty produces `apiKey: undefined`
 * and analytics falls back to the NoOp tracker; the app still boots.
 */
export function resolveWebsiteConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): WebsiteConfig | undefined {
  // Build-time skip: defer validation until first request.
  if (!env.SITE_URL && env.SKIP_ENV_VALIDATION === '1') {
    return WebsiteConfigSchema.parse({
      siteUrl: 'http://localhost:3002',
      posthog: {
        apiKey: env.NEXT_PUBLIC_POSTHOG_KEY,
        host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      },
    })
  }

  if (!env.SITE_URL) {
    return undefined
  }

  return WebsiteConfigSchema.parse({
    siteUrl: env.SITE_URL,
    posthog: {
      apiKey: env.NEXT_PUBLIC_POSTHOG_KEY,
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
    },
  })
}
