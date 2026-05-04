# @t/billing

Platform billing module. **RevenueCat is the primary billing / purchase layer across every app (web,
mobile, desktop).** All purchase UI, subscription state, and entitlement checks go through the
RevenueCat SDK on the client; RevenueCat webhooks are the source of truth for subscription state on
the server. **Stripe is used only as the underlying payment processor behind RevenueCat for web
payments** — it is configured inside the RevenueCat dashboard and never surfaced directly to app
code (no Stripe Checkout, no Stripe Customer Portal, no `@stripe/stripe-js`). Mobile uses RevenueCat
with native store IAP (StoreKit / Play Billing) underneath; desktop uses RevenueCat Web Billing. All
clients resolve entitlements through the `BillingRepository` port only — they never import a
provider SDK directly outside of the RevenueCat client wrapper.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients (apps/*) — RevenueCat SDK everywhere"]
        Web[apps/web<br/>Next.js RSC<br/>RevenueCat Web SDK]
        Desktop[apps/desktop<br/>electron-vite<br/>RevenueCat Web Billing]
        Mobile[apps/mobile<br/>Expo RN<br/>RevenueCat RN SDK]
    end

    subgraph RCLayer["RevenueCat — single billing layer for all apps"]
        RCService[RevenueCat service<br/>entitlements · paywalls · offerings<br/>receipt validation · customer]
        RCHook[RevenueCat webhook<br/>signed events · source of truth]
    end

    subgraph Rails["Payment rails behind RevenueCat"]
        AppStores[Apple App Store · Google Play<br/>native IAP rail for mobile]
        StripeProcessor[Stripe<br/>payment processor for web payments<br/>configured inside RevenueCat]
    end

    subgraph API["apps/api - Bun + Hono + tRPC"]
        RCRoute["POST /api/webhooks/revenuecat"]
        TRPCBilling["tRPC billing router<br/>entitlements.get · offerings.list"]
    end

    subgraph Package["packages/billing"]
        Port[BillingRepository<br/>port]
        RCImpl[RevenueCatBillingImpl<br/>REST via fetch · webhook handler]
        Schemas[Zod schemas<br/>customer / subscription / entitlement / events]
        DI[registerBillingDI]
    end

    subgraph Data["Data plane (Railway Postgres)"]
        EntTable[(entitlements<br/>user_id, product, status, expires_at)]
        EventLog[(billing_events<br/>idempotency + audit)]
    end

    Web -->|purchase / paywall| RCService
    Desktop -->|purchase / paywall| RCService
    Mobile -->|purchase / paywall| RCService

    Mobile -. StoreKit / Play Billing .-> AppStores
    AppStores --> RCService
    Web -. "card payment" .-> StripeProcessor
    Desktop -. "card payment" .-> StripeProcessor
    StripeProcessor --> RCService

    RCService -->|INITIAL_PURCHASE · RENEWAL<br/>CANCELLATION · BILLING_ISSUE| RCHook
    RCHook --> RCRoute
    RCRoute -->|verifyRevenueCatWebhook| RCImpl

    RCImpl -->|upsert entitlement<br/>(stub - pending @t/db)| EntTable
    RCImpl -->|append event<br/>(stub)| EventLog

    Web -->|entitlements.get| TRPCBilling
    Mobile -->|entitlements.get| TRPCBilling
    Desktop -->|entitlements.get| TRPCBilling
    TRPCBilling -->|port call| Port
    Port --> RCImpl
    Port -.->|read| EntTable

    DI -.->|binds dependencyKeys.global.BILLING_REPOSITORY| Port
    Schemas -.->|validates| RCImpl
```

One billing layer (RevenueCat) across every app, with one entitlement store on the server.
RevenueCat handles the purchase UX, receipt validation, subscription state, and webhook fan-out.
Stripe sits strictly inside the RevenueCat configuration as the web-payments rail — app code does
not import or call Stripe directly. Apple / Google IAP rails sit under RevenueCat on mobile. The
rest of the platform never cares which rail paid for a given entitlement; it only talks to the
`BillingRepository` port.

---

## File Layout

Scaffolded and shipped. Everything is nested under `src/`, matching sibling platform packages.

```text
packages/billing/
├── README.md
├── package.json                                   stripe ^19.1.0, zod ^3.23.0, vitest ^2.1.0
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── dependency-injection/
│   │   ├── index.ts
│   │   └── registerBillingDI.ts
│   ├── entities/
│   │   ├── index.ts
│   │   ├── ports/
│   │   │   ├── BillingRepository.ts               abstract port
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   │   ├── CustomerSchema.ts
│   │   │   ├── EntitlementSchema.ts
│   │   │   ├── SubscriptionSchema.ts
│   │   │   ├── WebhookEventSchema.ts
│   │   │   └── index.ts
│   │   └── types/
│   │       ├── BillingSource.ts                   "stripe" | "revenuecat"
│   │       └── index.ts
│   └── infrastructure/
│       ├── CompositeBillingImpl.ts                routes by provider / source
│       ├── RevenueCatBillingImpl.ts               REST via fetch (no official SDK)
│       ├── StripeBillingImpl.ts                   stripe@^19.1.0
│       ├── errors.ts                              BillingWebhookSignatureError, BillingProviderError
│       ├── index.ts
│       └── webhookVerifier.ts                     verifyStripeWebhook, verifyRevenueCatWebhook
└── tests/
    ├── fixtures/                                  RC JSON fixtures
    ├── infrastructure/                            4 test files
    └── schemas/                                   3 test files
```

---

## Ports and Impls

> **Architecture vs shipped code.** The target architecture is RevenueCat-primary across every app,
> with Stripe as the web payment processor configured inside RevenueCat (see top of this doc). The
> current scaffold also ships a `StripeBillingImpl` and `CompositeBillingImpl` wrapper — these were
> scaffolded before the RevenueCat-primary decision was locked in and will be retired / inlined
> behind RevenueCat in a follow-up. All consumers still bind to the single `billingRepository` DI
> key; the impl set behind it is an implementation detail that will collapse to
> `RevenueCatBillingImpl` as the primary surface, with Stripe code paths restricted to RevenueCat
> configuration and server-side reconciliation only.

Shipped today: `CompositeBillingImpl` wrapping `StripeBillingImpl` + `RevenueCatBillingImpl`. One DI
binding (`billingRepository`) resolves the composite — consumers never see the provider-specific
impls directly.

| Layer               | Symbol                       | Responsibility                                                                 | Status    |
| --- | --- | --- | --- |
| Port                | `BillingRepository`          | Abstract class (see signatures below)                                          | Shipped   |
| Impl (composite)    | `CompositeBillingImpl`       | Routes by `BillingSource`; `getEntitlements` returns `[...stripe, ...rc]` union | Shipped   |
| Impl (Stripe)       | `StripeBillingImpl`          | Stripe SDK @ API version `"2026-03-25.dahlia"`; checkout + event handling     | Shipped   |
| Impl (RevenueCat)   | `RevenueCatBillingImpl`      | REST via `fetch` (no official SDK); entitlements + event handling             | Shipped   |
| Webhook verifiers   | `webhookVerifier.ts`         | `verifyStripeWebhook`, `verifyRevenueCatWebhook`                              | Shipped   |
| Errors              | `errors.ts`                  | `BillingWebhookSignatureError`, `BillingProviderError`                        | Shipped   |
| DI registrar        | `registerBillingDI`          | Binds composite under `dependencyKeys.global.BILLING_REPOSITORY` (re-exported as `BILLING_REPOSITORY_DEPENDENCY_KEY` from `@t/billing`) | Shipped   |
| Schemas             | `entities/schemas/*`         | `CustomerSchema`, `EntitlementSchema`, `SubscriptionSchema`, `WebhookEventSchema` | Shipped |
| Types               | `entities/types/*`           | `BillingSource` = `"stripe" \| "revenuecat"`                                   | Shipped   |

### Port signatures

```ts
abstract class BillingRepository {
  abstract createCheckoutSession(userId: string, priceId: string): Promise<{ url: string }>;
  abstract getEntitlements(userId: string): Promise<Entitlement[]>;
  abstract handleStripeEvent(event: Stripe.Event): Promise<void>;
  abstract handleRevenueCatEvent(event: RevenueCatWebhookEvent): Promise<void>;
  abstract syncEntitlement(userId: string, subscription: Subscription, source: BillingSource): Promise<void>;
}
```

App code imports only `BillingRepository` and the types. Webhook handlers in `apps/api` inject the
port, never the SDK.

### Entitlement status normalization

`Entitlement.status` is a single union across both providers:

| Normalized status | Stripe signal                        | RevenueCat signal              |
| --- | --- | --- |
| `active`          | `active`, `trialing`                 | `INITIAL_PURCHASE`, `RENEWAL`  |
| `grace`           | `past_due`, `unpaid`                 | `BILLING_ISSUE`                |
| `cancelled`       | `canceled` (user-initiated)          | `CANCELLATION`                 |
| `expired`         | subscription period ended            | `EXPIRATION`                   |

### Stripe userId resolution

Stripe events do not carry a platform `userId` natively. Resolution order inside
`StripeBillingImpl`:

1. `event.data.object.metadata.userId`
2. `event.data.object.metadata.user_id`
3. `event.data.object.metadata.client_reference_id`

If none resolve, the impl logs a warning and skips the event — it does **not** throw. The webhook
route still returns `200` so Stripe does not retry indefinitely.

### Webhook verification

- **Stripe:** `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` from the
  official SDK.
- **RevenueCat:** timing-safe compare of the full `Authorization` header against
  `REVENUECAT_WEBHOOK_AUTH_HEADER` env (no HMAC — RC only supports static bearer headers).

### Env vars consumed

All via `@t/config` except where noted:

- `STRIPE_API_KEY`, `STRIPE_REDIRECT_DOMAIN`, `STRIPE_WEBHOOK_SECRET`
- `CORE_REVENUE_CAT_API_KEY`, `CORE_REVENUE_CAT_PROJECT_ID`,
  `CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID`
- `REVENUECAT_WEBHOOK_AUTH_HEADER` — plain `process.env`; **not yet in the config schema** (see
  follow-ups)

---

## Payment Surface Matrix

RevenueCat is the single billing SDK across every app. Stripe is not an app-level surface — it is
configured inside RevenueCat as the web payment rail and never imported by app code.

| App             | Client billing SDK       | Purchase rail under RevenueCat                          | Notes                                                                 |
| --- | --- | --- | --- |
| `apps/web`      | RevenueCat Web SDK       | Stripe (configured inside RevenueCat, server-side)      | Paywalls + purchase UI are RevenueCat components; no Stripe Checkout, no Stripe Customer Portal, no `@stripe/stripe-js` |
| `apps/desktop`  | RevenueCat Web Billing   | Stripe (configured inside RevenueCat, server-side)      | Uses RevenueCat Web Billing under the hood; no separate Stripe flow, no embedded web checkout                         |
| `apps/mobile`   | RevenueCat RN SDK        | StoreKit (iOS) · Play Billing (Android)                 | Native IAP required by Apple + Google store policy (30% / 15%) for digital goods                                      |
| `apps/website`  | —                        | —                                                        | Marketing only; no auth, no billing surface                                                                           |

RevenueCat normalizes every rail (Stripe for web, StoreKit for iOS, Play Billing for Android) into
one SDK surface and one webhook stream, so clients ship one billing integration and the server reads
one source of truth.

---

## Status: scaffolded — pending wiring

Package is published to the workspace as `@t/billing`. Port, composite + both concrete impls,
schemas, webhook verifiers, and DI registrar are shipped. Unit tests cover schema parsing and
webhook/composite behavior. The remaining work is pure wiring — no new billing logic required in
`packages/billing` itself.

Open wiring items:

1. **DI key.** ~~Add `dependencyKeys.global.BILLING_REPOSITORY = "billingRepository"` in
   `packages/dependency-injection/`.~~ Done — the registrar binds under
   `dependencyKeys.global.BILLING_REPOSITORY` and `@t/billing` re-exports the canonical token as
   `BILLING_REPOSITORY_DEPENDENCY_KEY`.
2. **Config schema.** Extend `@t/config`'s env schema with `REVENUECAT_WEBHOOK_AUTH_HEADER`.
   Currently read directly from `process.env`.
3. **Composition root.** Call `registerBillingDI(...)` inside `apps/api/src/index.ts`, after
   `config` + `logging`.
4. **Webhook route.** Add `POST /api/webhooks/revenuecat` in `apps/api`: read raw body →
   `verifyRevenueCatWebhook` → call `billingRepository.handleRevenueCatEvent`. RevenueCat is the
   single billing webhook; the scaffold-era `POST /api/webhooks/stripe` is not part of the target
   architecture — Stripe events surface through RevenueCat's webhook stream.
5. **Real persistence.** `syncEntitlement` is a **logging stub** in the RevenueCat impl (and in the
   scaffold-era `StripeBillingImpl`, which will be retired); `StripeBillingImpl.getEntitlements`
   currently returns `[]` and the composite currently unions empty-Stripe + RC as an artifact. Wire
   to a real `billing_events(event_id, processed_at)` idempotency table and entitlement writes once
   `@t/db` exposes a `BillingEventRepository`.

### Downstream bootstrap (outside `packages/billing`)

Tracked here for visibility; owned by the consumer apps:

- [ ] tRPC `billing` router: `entitlements.get`, `offerings.list` (no `checkout.create` — purchase
  UX is owned by the RevenueCat client SDK, not the server)
- [ ] `apps/web` wired to the RevenueCat Web SDK (paywall + purchase UX client-side)
- [ ] `apps/desktop` wired to RevenueCat Web Billing in the renderer
- [ ] `apps/mobile` wired to RevenueCat RN SDK with `Purchases.configure`
- [ ] Integration test: replay sample RevenueCat webhooks and assert entitlement rows once
  persistence lands

---

## Consumers

| Consumer        | How it uses `@t/billing`                                                         |
| --- | --- |
| `apps/api`      | RevenueCat webhook handler calls the port; tRPC billing router reads entitlements. The webhook route lives outside the tRPC router because RevenueCat requires raw-body signature verification. Stripe event reconciliation (if any) happens server-side via RevenueCat's events — there is no app-level Stripe webhook surface. |
| `apps/web`      | RevenueCat Web SDK handles paywalls and purchase UI directly on the client; `billing.entitlements.get` (via tRPC) feeds feature-gate RSCs from the server-side entitlement row. |
| `apps/desktop`  | RevenueCat Web Billing drives purchase UX in the renderer; same `billing.entitlements.get` tRPC call as web feeds feature gating. No `shell.openExternal` Stripe Checkout handoff. |
| `apps/mobile`   | RevenueCat RN SDK is the only client-side billing code. After purchase completes on-device (via StoreKit / Play Billing under RevenueCat), the mobile app hits `billing.entitlements.get` to refresh cached entitlements — it does NOT trust RevenueCat's client-side state for feature gating. The webhook-driven DB row is the source of truth. |
| `apps/website`  | No billing. Marketing site links to `/signup` on `apps/web`.                             |

---

## Open Items

Scaffold-phase decisions already resolved in code are no longer listed here — see the "Status"
section above. Remaining domain questions:

- **Unified entitlement abstraction**: the shipped `EntitlementSchema` is entitlement-first
  (RevenueCat-style superset). Stripe-only fields are derived in `StripeBillingImpl` when
  translating `Subscription` → `Entitlement`. Revisit if a Stripe-only field needs to round-trip
  back to clients.
- **Idempotency**: Stripe retries on 5xx up to 3 days; RevenueCat retries on non-2xx. The planned
  `billing_events(provider, event_id, processed_at)` table must drop duplicates at the adapter
  boundary — currently unimplemented because `syncEntitlement` is a logging stub.
- **Customer identity join**: Stripe `customer.id` and RevenueCat `app_user_id` must both map back
  to the platform `user_id`. Stripe resolution uses metadata fallbacks (see "Stripe userId
  resolution" above); RC uses `app_user_id` directly. Decide whether to store provider customer ids
  on the `users` table or in a `billing_identities` side table.
- **Refunds and chargebacks**: Stripe `charge.refunded` and RevenueCat `CANCELLATION`/`REFUND`
  events must both revoke entitlements immediately. Currently both paths hit the `syncEntitlement`
  logging stub — behavior is correct in shape, persistence pending.
- **Cross-rail entitlement portability**: a user who buys on mobile (RevenueCat + StoreKit / Play
  Billing) and logs in on web should see the same entitlement. Since RevenueCat is the single source
  of truth across every rail, portability is a property of the RevenueCat customer record — no
  Stripe-to-RC reconciliation is needed because Stripe never issues entitlements directly. (The
  shipped `CompositeBillingImpl.getEntitlements` currently unions Stripe + RC rows as a scaffold
  artifact; this collapses to RC-only once the composite is retired.)
- **Pricing model source of truth**: RevenueCat Offerings are the canonical catalog across every app
  and every rail. Stripe Products / Prices are configured inside the RevenueCat dashboard as the web
  rail's backing catalog — not maintained independently.
- **Test fixtures**: RevenueCat JSON fixtures live under `packages/billing/tests/fixtures/`. Stripe
  fixtures are currently inlined in the unit tests — capture a representative set under the same
  `fixtures/` directory once the persistence path lands.
- **Legal**: EU VAT is handled inside RevenueCat (Stripe Tax applies on the web rail, configured
  inside the RevenueCat dashboard); app-store handles tax on mobile side — confirm no double-tax
  scenarios when a user has active entitlements across rails.
