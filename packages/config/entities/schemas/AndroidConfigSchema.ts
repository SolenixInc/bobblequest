import { z } from 'zod'

/**
 * Schema for Android configuration namespace.
 *
 * Defines configuration values required for Android related functionality.
 *
 * **Environment Variables:**
 * - `ANDROID_PUBLISHER_URL` - URL for the Android publisher service
 */
export const AndroidConfigSchema = z.object({
  /**
   * URL for the Android publisher service.
   *
   * Used to interact with Android publishing APIs.
   *
   * **Environment Variable:** `ANDROID_PUBLISHER_URL`
   */
  publisherUrl: z.string().describe('URL for the Android publisher service'),
})

/**
 * Type inferred from AndroidConfigSchema.
 */
export type AndroidConfig = z.infer<typeof AndroidConfigSchema>
