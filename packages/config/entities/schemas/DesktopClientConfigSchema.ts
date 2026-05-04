import { z } from 'zod'

/**
 * Schema for desktop renderer (client-side) configuration values.
 *
 * Validates the VITE_* environment variables consumed exclusively by
 * apps/desktop's renderer process. These are injected at build time by
 * Vite and bundled into the renderer output. No server secrets.
 *
 * **Environment Variables:**
 * - `VITE_CLERK_PUBLISHABLE_KEY` — client publishable key for Clerk SDK init
 * - `VITE_API_URL` — tRPC API base URL
 * - `VITE_REVENUECAT_PUBLIC_API_KEY` — RevenueCat public API key for in-app purchases
 */
export const DesktopClientConfigSchema = z.object({
  /**
   * Clerk publishable key.
   *
   * Used by the desktop renderer to initialise the Clerk client SDK.
   *
   * **Environment Variable:** `VITE_CLERK_PUBLISHABLE_KEY`
   */
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'VITE_CLERK_PUBLISHABLE_KEY is required')
    .describe('Clerk publishable key for desktop renderer'),

  /**
   * tRPC API base URL.
   *
   * **Environment Variable:** `VITE_API_URL`
   */
  VITE_API_URL: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .url('VITE_API_URL must be a valid URL')
    .describe('tRPC API base URL for desktop renderer'),

  /**
   * RevenueCat public API key.
   *
   * **Environment Variable:** `VITE_REVENUECAT_PUBLIC_API_KEY`
   */
  VITE_REVENUECAT_PUBLIC_API_KEY: z
    .string()
    .min(1, 'VITE_REVENUECAT_PUBLIC_API_KEY is required')
    .describe('RevenueCat public API key for desktop renderer'),
})

/**
 * Type inferred from DesktopClientConfigSchema.
 *
 * Parsed desktop renderer configuration object.
 */
export type DesktopClientConfig = z.infer<typeof DesktopClientConfigSchema>
