# 005 — RevenueCat as primary billing layer

## Status

Accepted

---

## Context and problem statement

The product ships on five surfaces: a web app, a marketing website with a paywall, a React Native
mobile app (iOS + Android), and an
Electron desktop app. Each surface needs to charge users, gate features behind subscription tiers,
and report entitlement state back
to the application UI.

Without a cross-platform entitlement layer, the team would need to integrate independently with the
App Store (StoreKit), Google
Play Billing, and Stripe, then build and maintain a reconciliation service that unifies purchase
receipts into a single user
entitlement state. That service is non-trivial, requires ongoing maintenance, and is not
differentiated product work.

---

## Decision drivers

- Single source of truth for entitlements across App Store, Google Play, and web (Stripe) purchases
- One user identity model that spans paywalls on every surface
- Single webhook surface for billing lifecycle events (new subscription, renewal, cancellation,
  refund)
- Audit trail: RevenueCat's dashboard and event log must cover compliance-grade purchase history
- App-side billing UI must use the platform-native SDK — no direct Stripe integration on mobile or
  desktop

---

## Considered options

- Option A: Stripe-only
- Option B: RevenueCat (chosen)
- Option C: Custom in-house entitlements service

---

## Decision outcome

Chosen option: **Option B — RevenueCat** — RevenueCat is the source of truth for entitlements on
every app surface.

- **Web**: Stripe is used as the web payment processor, but only through RevenueCat's web billing
  integration. The web app and
  website paywall surfaces use the RevenueCat web SDK (`@revenuecat/purchases-js`), not Stripe's own
  SDK directly.
- **Mobile**: iOS and Android use native StoreKit and Google Play Billing, surfaced through the
  RevenueCat React Native SDK
  (`react-native-purchases`).
- **Desktop**: Electron uses RevenueCat web billing (same as web).

App-side billing UI — paywalls, subscription management, entitlement checks — **must use RevenueCat
SDKs exclusively**. Stripe APIs
are only ever called server-side by RevenueCat; no app code imports `@stripe/stripe-js` for billing
UI.

---

## Consequences

### Positive

- One entitlement model for all platforms — `getCustomerInfo()` returns the same shape regardless of
  how the user subscribed
- No per-store purchase receipt validation code to write or maintain
- RevenueCat handles billing lifecycle webhooks; the app's webhook surface is a single RevenueCat
  endpoint
- RevenueCat dashboard provides a purchase history audit trail without custom tooling

### Negative

- Vendor lock-in to RevenueCat: migrating to a different billing layer would require replacing all
  SDK call sites across five apps
- RevenueCat's pricing is revenue-percentage-based; cost scales with growth
- Requires a RevenueCat account, Stripe–RevenueCat integration setup, and App Store / Play Store
  entitlement configuration

### Neutral

- Requires a one-time setup of the RevenueCat-Stripe integration for web billing; mobile stores are
  configured in the RevenueCat
  dashboard separately
- Stripe remains a dependency for web payment processing but is encapsulated behind RevenueCat — app
  code never calls Stripe
  billing APIs

---

## Pros and cons of the options

### Option A: Stripe-only

**Pros:**

- Single vendor; straightforward web billing implementation
- Stripe's documentation and SDKs are among the best in the industry
- No revenue-share pricing beyond Stripe's own transaction fees

**Cons:**

- No native App Store or Google Play Billing support — adding iOS/Android subscriptions requires a
  completely separate integration
  with StoreKit and Google Play Billing
- Cross-platform entitlement reconciliation (Stripe + App Store + Play Store) requires a custom
  service — this is the exact
  problem RevenueCat solves
- Not viable as a sole solution for a product that ships on mobile

---

### Option B: RevenueCat (chosen)

**Pros:**

- Cross-platform entitlement source of truth out of the box — one API for web, iOS, and Android
  purchases
- Manages App Store and Play Store receipt validation automatically
- Web billing through Stripe is supported without requiring a custom Stripe integration at the app
  layer
- Webhook surface is unified; billing events from all stores arrive via one RevenueCat webhook

**Cons:**

- Revenue-percentage pricing model (scales with MRR)
- Vendor lock-in; migrating away would touch every billing call site across all apps

---

### Option C: Custom in-house entitlements service

**Pros:**

- Full ownership and control; no external vendor dependency
- No revenue-share cost

**Cons:**

- Massive engineering investment: implementing receipt validation for App Store (server-side),
  Google Play (server-side), and Stripe
  plus a reconciliation layer is a multi-month project
- Ongoing maintenance burden: stores change their APIs; staying current is a recurring cost
- No product differentiation value — this is infrastructure, not product
- Delay to market: blocks monetization until the service is production-ready

---

## Links

- Billing architecture: `<TBD: docs/architecture/platform/billing/>`
- RevenueCat documentation: <https://www.revenuecat.com/docs> (placeholder)
- Stripe billing documentation: <https://docs.stripe.com/billing> (placeholder)

---

_Last reviewed: 2026-04-28 — owner: TBD_
