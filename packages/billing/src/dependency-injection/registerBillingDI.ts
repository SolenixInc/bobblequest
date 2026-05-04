import type { RevenueCatConfig, StripeConfig } from '@t/config'
import { type Container, asValue, dependencyKeys } from '@t/dependency-injection'
import { CompositeBillingImpl } from '../infrastructure/CompositeBillingImpl.ts'
import { RevenueCatBillingImpl } from '../infrastructure/RevenueCatBillingImpl.ts'
import { StripeBillingImpl } from '../infrastructure/StripeBillingImpl.ts'

/**
 * DI key for the global `BillingRepository` binding.
 *
 * Re-exported alias of `dependencyKeys.global.BILLING_REPOSITORY` owned
 * by `@t/dependency-injection`. Preferred consumer form is to import the
 * canonical token directly; this alias is provided for symmetry with
 * `@t/cache` / `@t/db`.
 */
export const BILLING_REPOSITORY_DEPENDENCY_KEY = dependencyKeys.global.BILLING_REPOSITORY

/**
 * Options bag for {@link registerBillingDI}.
 *
 * Options-bag form is mandatory â€” the registrar stays explicit at the
 * composition root and keeps `process.env` reads out of `@t/billing`.
 */
export interface RegisterBillingDIOptions {
  readonly stripeConfig: StripeConfig
  readonly revenuecatConfig: RevenueCatConfig
  /**
   * Shared-secret value that the RevenueCat dashboard is configured to
   * attach to every webhook request in the `Authorization` header. The
   * webhook route in `apps/api` compares the inbound header against this
   * value via {@link verifyRevenueCatWebhook} before dispatching.
   */
  readonly revenuecatWebhookAuthHeader: string
}

/**
 * Registers the billing bindings in the DI container.
 *
 * Binds the composite impl under
 * `dependencyKeys.global.BILLING_REPOSITORY` (re-exported as
 * {@link BILLING_REPOSITORY_DEPENDENCY_KEY}).
 *
 * Lifetime: singleton. The Stripe client inside `StripeBillingImpl` keeps
 * a long-lived keep-alive connection pool â€” do not scope it per-request.
 */
export function registerBillingDI(container: Container, opts: RegisterBillingDIOptions): void {
  const { stripeConfig, revenuecatConfig, revenuecatWebhookAuthHeader } = opts

  if (!stripeConfig.apiKey) {
    throw new TypeError('registerBillingDI: stripeConfig.apiKey is required')
  }
  if (!stripeConfig.redirectDomain) {
    throw new TypeError('registerBillingDI: stripeConfig.redirectDomain is required')
  }
  if (!stripeConfig.webhookSecret) {
    throw new TypeError('registerBillingDI: stripeConfig.webhookSecret is required')
  }
  if (!revenuecatConfig.apiKey) {
    throw new TypeError('registerBillingDI: revenuecatConfig.apiKey is required')
  }
  if (!revenuecatConfig.projectId) {
    throw new TypeError('registerBillingDI: revenuecatConfig.projectId is required')
  }
  if (!revenuecatConfig.nutraforgeEntitlementId) {
    throw new TypeError('registerBillingDI: revenuecatConfig.nutraforgeEntitlementId is required')
  }
  if (!revenuecatWebhookAuthHeader) {
    throw new TypeError('registerBillingDI: revenuecatWebhookAuthHeader is required')
  }

  container.register({
    [BILLING_REPOSITORY_DEPENDENCY_KEY]: asValue(
      new CompositeBillingImpl({
        stripe: new StripeBillingImpl({ config: stripeConfig }),
        revenuecat: new RevenueCatBillingImpl({
          config: revenuecatConfig,
          webhookAuthHeader: revenuecatWebhookAuthHeader,
        }),
      }),
    ),
  })
}
