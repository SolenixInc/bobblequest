import { z } from 'zod'

/**
 * Schema for Stripe configuration namespace.
 *
 * Defines configuration values required for interacting with Stripe payments
 * and subscription services.
 *
 * **Environment Variables:**
 * - `STRIPE_API_KEY` - Secret key for Stripe API
 * - `STRIPE_REDIRECT_DOMAIN` - Domain for payment redirects
 * - `STRIPE_WEBHOOK_SECRET` - Secret for validating Stripe webhooks
 */
export const StripeConfigSchema = z.object({
  /**
   * Stripe API Key.
   *
   * Secret key used for authenticating with Stripe API.
   *
   * **Environment Variable:** `STRIPE_API_KEY`
   */
  apiKey: z.string().describe('Stripe API Key'),

  /**
   * Stripe Redirect Domain.
   *
   * Base URL/Domain used for constructing return URLs during checkout flows.
   *
   * **Environment Variable:** `STRIPE_REDIRECT_DOMAIN`
   */
  redirectDomain: z.string().describe('Stripe Redirect Domain'),

  /**
   * Stripe Webhook Secret.
   *
   * Secret used to verify signature of incoming webhook events from Stripe.
   *
   * **Environment Variable:** `STRIPE_WEBHOOK_SECRET`
   */
  webhookSecret: z.string().describe('Stripe Webhook Secret'),
})

/**
 * Type inferred from StripeConfigSchema.
 */
export type StripeConfig = z.infer<typeof StripeConfigSchema>
