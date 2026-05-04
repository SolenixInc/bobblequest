import { z } from 'zod'

/**
 * Schema for App Store configuration namespace.
 *
 * Defines configuration values required for interacting with Apple App Store services,
 * specifically for validating receipts and managing subscriptions.
 *
 * **Environment Variables:**
 * - `APP_STORE_BUNDLE_ID` - The bundle identifier of the application
 * - `APP_STORE_ENVIRONMENT` - The environment (Sandbox or Production)
 */
export const AppStoreConfigSchema = z.object({
  /**
   * The bundle identifier of the application.
   *
   * Uniquely identifies the app in the App Store.
   *
   * **Environment Variable:** `APP_STORE_BUNDLE_ID`
   */
  bundleId: z.string().describe('The bundle identifier of the application'),

  /**
   * The environment for App Store services.
   *
   * typically "Sandbox" or "Production".
   *
   * **Environment Variable:** `APP_STORE_ENVIRONMENT`
   */
  environment: z.string().describe('The environment (Sandbox or Production)'),
})

/**
 * Type inferred from AppStoreConfigSchema.
 */
export type AppStoreConfig = z.infer<typeof AppStoreConfigSchema>
