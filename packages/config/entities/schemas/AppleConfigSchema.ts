import { z } from 'zod'

/**
 * Schema for Apple configuration namespace.
 *
 * Defines general Apple-related configuration, often for legacy or shared services
 * distinct from specific App Store IAP config.
 *
 * **Environment Variables:**
 * - `APPLE_PROD_URL` - Production URL for Apple services
 * - `APPLE_SANDBOX_URL` - Sandbox URL for Apple services
 * - `APPLE_SHARED_SECRET` - Shared secret for validating receipts
 */
export const AppleConfigSchema = z.object({
  /**
   * Production URL for Apple services.
   *
   * **Environment Variable:** `APPLE_PROD_URL`
   */
  prodUrl: z.string().describe('Production URL for Apple services'),

  /**
   * Sandbox URL for Apple services.
   *
   * **Environment Variable:** `APPLE_SANDBOX_URL`
   */
  sandboxUrl: z.string().describe('Sandbox URL for Apple services'),

  /**
   * Shared secret for validating receipts.
   *
   * Used to authenticate requests with Apple's servers.
   *
   * **Environment Variable:** `APPLE_SHARED_SECRET`
   */
  sharedSecret: z.string().describe('Shared secret for validating receipts'),
})

/**
 * Type inferred from AppleConfigSchema.
 */
export type AppleConfig = z.infer<typeof AppleConfigSchema>
