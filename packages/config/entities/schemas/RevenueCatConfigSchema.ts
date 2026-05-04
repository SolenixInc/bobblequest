import { z } from 'zod'

/**
 * Schema for RevenueCat configuration namespace.
 *
 * Defines configuration values required for interacting with RevenueCat API.
 *
 * **Environment Variables:**
 * - `CORE_REVENUE_CAT_API_KEY` - API Key for RevenueCat
 * - `CORE_REVENUE_CAT_PROJECT_ID` - Project ID for RevenueCat
 */
export const RevenueCatConfigSchema = z.object({
  /**
   * RevenueCat API Key.
   *
   * **Environment Variable:** `CORE_REVENUE_CAT_API_KEY`
   */
  apiKey: z.string().describe('RevenueCat API Key'),

  /**
   * RevenueCat Project ID.
   *
   * **Environment Variable:** `CORE_REVENUE_CAT_PROJECT_ID`
   */
  projectId: z.string().describe('RevenueCat Project ID'),

  /**
   * NutraForge Entitlement ID.
   *
   * **Environment Variable:** `CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID`
   */
  nutraforgeEntitlementId: z.string().describe('NutraForge Entitlement ID'),

  /**
   * Shared-secret header value sent by RevenueCat in the `Authorization`
   * header of every webhook request. Configured in the RevenueCat dashboard
   * under Project → Integrations → Webhooks.
   *
   * **Environment Variable:** `REVENUECAT_WEBHOOK_AUTH_HEADER`
   */
  webhookAuthHeader: z.string().min(1).describe('RevenueCat webhook Authorization header secret'),

  /**
   * RevenueCat API Key for Apple App Store (iOS).
   *
   * **Environment Variable:** `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`
   */
  appleApiKey: z.string().optional().describe('RevenueCat Apple API Key'),

  /**
   * RevenueCat API Key for Google Play Store (Android).
   *
   * **Environment Variable:** `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`
   */
  googleApiKey: z.string().optional().describe('RevenueCat Google API Key'),
})

/**
 * Type inferred from RevenueCatConfigSchema.
 */
export type RevenueCatConfig = z.infer<typeof RevenueCatConfigSchema>
