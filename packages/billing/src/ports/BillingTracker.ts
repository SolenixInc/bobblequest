/**
 * @fileoverview BillingTracker port — browser-safe interface.
 *
 * Defines the minimal contract a browser billing implementation must satisfy.
 * Consumers (e.g. `@t/billing-browser`) depend ONLY on this port, never on a
 * concrete impl or provider SDK.
 *
 * Design notes:
 * - Pure types / interface — zero runtime code, no imports of `server-only`,
 *   no Node-only deps. Safe to bundle in any `'use client'` module.
 * - Shape mirrors RevenueCat's `CustomerInfo` so the RC browser adapter is
 *   trivial, while keeping the naming provider-neutral.
 * - `configure` may be sync or async — callers must always `await` it.
 */

/** A single active entitlement as returned by the billing provider. */
export type EntitlementInfo = {
  /** The entitlement identifier (e.g. `"pro"`, `"premium"`). */
  identifier: string
  /** Whether this entitlement is currently active. */
  isActive: boolean
  /**
   * ISO-8601 date string when the entitlement expires, or `null` if it does
   * not expire (lifetime / non-renewing purchases that have not yet expired).
   */
  expirationDate?: string | null
}

/**
 * Customer billing state as returned by {@link BillingTracker.getCustomerInfo}.
 *
 * Structural subset of RevenueCat's `CustomerInfo` — enough for entitlement
 * gating without importing the RC SDK on the type surface.
 */
export type CustomerInfo = {
  entitlements: {
    /** Map of entitlement identifier → entitlement detail. */
    active: Record<string, EntitlementInfo>
  }
}

/**
 * Browser-safe billing port. Implementations adapt this surface to a concrete
 * provider (RevenueCat browser SDK, NoOp). Consumers depend ONLY on this port.
 */
export interface BillingTracker {
  /**
   * Configure the billing SDK for the current user session. Must be awaited
   * before calling any other method.
   *
   * @param opts.apiKey  - Provider public API key (safe for the browser).
   * @param opts.appUserId - Optional user identifier. When omitted the
   *   implementation generates an anonymous ID.
   */
  configure(opts: { apiKey: string; appUserId?: string }): Promise<void> | void

  /**
   * Fetch the current customer's billing state, including all active
   * entitlements. Callers should await this on every mount / resume — the
   * implementation may cache the result internally.
   */
  getCustomerInfo(): Promise<CustomerInfo>

  /**
   * Initiate a purchase flow for the given package. The provider SDK owns the
   * checkout UI; the promise resolves with `{ ok: true }` on success.
   *
   * Implementations may throw a typed error on cancellation or failure.
   */
  purchase(input: { packageId: string }): Promise<{ ok: true }>
}
