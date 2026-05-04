# @t/billing

Platform billing adapter. **RevenueCat is the primary billing / purchase layer
across every app (web, mobile, desktop)** and sits behind a single
`BillingRepository` port. Stripe is used only as the web-payment processor
**inside the RevenueCat configuration** â€” never as an app-level surface.

## Architecture

One billing layer (RevenueCat) across every app, one entitlement store on the
server, and one rail per app configured inside RevenueCat:

- `RevenueCatBillingImpl` â€” REST + webhook (Authorization-header shared
  secret). The primary impl; source of truth for entitlements.
- Rails under RevenueCat (configuration-only, not app-level code):
  - Web: Stripe, configured inside the RevenueCat dashboard.
  - Mobile: StoreKit (iOS) and Play Billing (Android), required by app-store
    policy for digital goods.
  - Desktop: RevenueCat Web Billing (Stripe rail under the hood).

Scaffold note: the current tree also ships a `StripeBillingImpl` and a
`CompositeBillingImpl` wrapper. These predate the RevenueCat-primary decision
and will collapse behind `RevenueCatBillingImpl` in a follow-up. The DI
binding (`billingRepository`) is stable â€” app code only ever sees
`BillingRepository`.

## Environment variables

Pulled from `@t/config` â€” do NOT read `process.env` from this package.

| Var                                       | Used by            |
| --- | --- |
| `STRIPE_API_KEY`                          | StripeBillingImpl  |
| `STRIPE_REDIRECT_DOMAIN`                  | StripeBillingImpl  |
| `STRIPE_WEBHOOK_SECRET`                   | verifyStripeWebhook|
| `CORE_REVENUE_CAT_API_KEY`                | RevenueCatBillingImpl |
| `CORE_REVENUE_CAT_PROJECT_ID`             | RevenueCatBillingImpl |
| `CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID` | RevenueCatBillingImpl |
| (RC webhook shared secret â€” config-driven, dashboard-matched) | verifyRevenueCatWebhook |

## DI registration

```ts
import { registerBillingDI } from "@t/billing";

registerBillingDI(container, {
    stripeConfig: config.stripe,
    revenuecatConfig: config.revenuecat,
    revenuecatWebhookAuthHeader: config.revenuecat.webhookAuthHeader,
});

const billing = container.resolve("billingRepository");
```

> TODO: the binding key `"billingRepository"` is a placeholder â€” migrate to
> `dependencyKeys.global.BILLING_REPOSITORY` once that token lands in
> `@t/dependency-injection` (separate PR, scope-fenced from this one).

## Webhook routes (TODO in apps/api)

Two routes, raw-body required for Stripe:

- `POST /webhooks/stripe`
  - Read raw body â†’ `verifyStripeWebhook(...)` â†’ `billing.handleStripeEvent(event)`.
  - Respond 401 on `BillingWebhookSignatureError`, 200 on success.
- `POST /webhooks/revenuecat`
  - `verifyRevenueCatWebhook({ authorizationHeader, expectedHeader })` â†’
    `RevenueCatWebhookEventSchema.parse(body)` â†’ `billing.handleRevenueCatEvent(event)`.

Idempotency on `event.id` (both providers) belongs in the `billing_events`
DB table that `syncEntitlement` will write to.

## Scope fence

This package is the pure port + adapters â€” no DB, no HTTP handler wiring.
The following land in follow-up PRs:

- `packages/db/repositories/BillingEventRepository` â€” persists `billing_events`
  and `entitlements` rows. `syncEntitlement` is stubbed (logs only) until
  that repo exists.
- `apps/api/src/routers/webhooks/{stripe,revenuecat}.ts` â€” raw-body routes.
- `packages/dependency-injection` â€” add
  `dependencyKeys.global.BILLING_REPOSITORY`.

## Ambiguities & defaults shipped

See `docs/architecture/platform/billing.md` â€” this scaffold resolves the
open items as follows:

- Composite vs single impl â†’ tree currently ships three impls
  (`RevenueCat`, `Stripe`, `Composite`) as a scaffold artifact; target is
  `RevenueCat` as the single primary impl with Stripe relegated to
  RevenueCat-internal configuration.
- Grace period normalization â†’ RC `BILLING_ISSUE` â†’ `"grace"`.
- Refunds / chargebacks â†’ immediate revocation (`"cancelled"`).
- Entitlements â†’ RevenueCat is the single source of truth; any Stripe rows
  from the current composite are a scaffold detail, not a peer source.
- Pricing catalog â†’ RevenueCat Offerings are the canonical catalog; Stripe
  Products / Prices are configured inside the RevenueCat dashboard as the web
  rail.

## Testing

```bash
bun install
bun run --cwd packages/billing typecheck
bun run --cwd packages/billing test
```

Tests use `vitest`; fixtures live under `tests/fixtures/`.


## Port subpath

`@t/billing/ports` exposes the browser-safe port interfaces for consumption by `@t/billing-browser`
and any other cross-runtime consumer:

| Export | Description |
| --- | --- |
| `BillingTracker` | Primary port interface — `getCustomerInfo()`, `getEntitlement()`, `restorePurchases()` |
| `EntitlementInfo` | Value type for a single entitlement (id, isActive, expiresDate) |
| `CustomerInfo` | Value type for the full customer record returned by RevenueCat |

These types are zero-runtime (interfaces only). Import them from `@t/billing/ports` — never from the
package root — to avoid pulling server-only dependencies into browser bundles.
