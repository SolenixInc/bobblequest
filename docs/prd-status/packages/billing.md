---
name: billing bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/billing/** or apps/*/billing wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/billing — bootstrap status

**Package status:** 🟡 (scaffolded; eager DI registration shipped 2026-04-26; pending persistence +
Stripe-collapse)

## Intended (per docs)

- **Target:** RevenueCat-primary across every app (web, mobile, desktop). Stripe is configured
  inside RevenueCat as the web payment rail only — not an app-level surface and not a separate
  webhook path.
- `BillingRepository` port; primary impl `RevenueCatBillingImpl`. The scaffold-era
  `StripeBillingImpl` and `CompositeBillingImpl` (routing by `BillingSource`) will collapse behind
  RevenueCat in a follow-up — keep them for now, but `billingRepository` is the only binding app
  code sees.
- Webhook verifier: `verifyRevenueCatWebhook` (the scaffold-era `verifyStripeWebhook` remains in
  tree and will be retired alongside `StripeBillingImpl`).
- Zod schemas: `CustomerSchema`, `SubscriptionSchema`, `EntitlementSchema`, `WebhookEventSchema`
- DI registrar `registerBillingDI` binding `billingRepository`
- Normalized entitlement status: `active | grace | cancelled | expired` sourced from RevenueCat events.
- Source: `docs/architecture/platform/billing.md`; `docs/architecture/ARCHITECTURE.md` Section
  `packages/billing`; `packages/billing/README.md`

## Actual (present files)

- `src/entities/ports/BillingRepository.ts` — abstract port (createCheckoutSession, getEntitlements,
  handleStripeEvent, handleRevenueCatEvent, syncEntitlement)
- `src/entities/ports/index.ts`
- `src/entities/schemas/{CustomerSchema,EntitlementSchema,SubscriptionSchema,WebhookEventSchema,index}.ts`
- `src/entities/types/{BillingSource,index}.ts` (`"stripe" | "revenuecat"`)
- `src/entities/index.ts`
- `src/infrastructure/StripeBillingImpl.ts` (stripe@^19.1.0, API `2026-03-25.dahlia`)
- `src/infrastructure/RevenueCatBillingImpl.ts` (REST via `fetch`, no official SDK)
- `src/infrastructure/CompositeBillingImpl.ts` (union `[...stripe, ...rc]`, no dedup)
- `src/infrastructure/webhookVerifier.ts` (Stripe SDK `constructEvent` + RC timing-safe header
  compare)
- `src/infrastructure/errors.ts` (`BillingWebhookSignatureError`, `BillingProviderError`)
- `src/infrastructure/index.ts`, `src/index.ts`
- `src/dependency-injection/registerBillingDI.ts` + `index.ts` (singleton binding on canonical
  `dependencyKeys.global.BILLING_REPOSITORY` from `@t/dependency-injection`; local
  `BILLING_REPOSITORY_DEPENDENCY_KEY` export aliases that token)
- Tests:
  `tests/infrastructure/{CompositeBillingImpl,RevenueCatBillingImpl,StripeBillingImpl,webhookVerifier}.test.ts`;
  `tests/schemas/{EntitlementSchema,SubscriptionSchema,WebhookEventSchema}.test.ts`;
  `tests/fixtures/revenuecat{BillingIssue,InitialPurchase}.json`
- `README.md`, `package.json`, `tsconfig.json`, `vitest.config.ts`
- Note: there are also empty top-level `dependency-injection/`,
  `entities/{ports,schemas/googlePlayNotification}`, `infrastructure/` directories outside `src/` —
  leftover from an earlier layout; safe to delete.

## Consumer hooks

- **Registrar fn:** `registerBillingDI(container, { stripeConfig, revenuecatConfig,
  revenuecatWebhookAuthHeader })`; binds `BILLING_REPOSITORY` via `asValue` (eager — constructors
  run at registration time, so RevenueCat/Stripe config validation surfaces at boot and is caught by
  the composition-root `try/catch`); called from `apps/api/src/composition.ts#buildContainer()`
  after config + logging (wired 2026-04-25; switched `asFunction` → `asValue` 2026-04-26). Note:
  `stripeConfig` is a scaffold-era option — once `StripeBillingImpl` collapses behind RevenueCat,
  only `revenuecatConfig` + `revenuecatWebhookAuthHeader` will remain.
- **Webhook route factory:** **wired 2026-04-26** — `apps/api/src/routes/webhooks/revenuecat.ts`
  exports `createRevenueCatWebhookApp(container)`, mounted at `/api/webhooks/revenuecat` in
  `apps/api/src/index.ts`. Reads raw body, calls `verifyRevenueCatWebhook` from `@t/billing`
  (timing-safe compare against `config.revenueCat.webhookAuthHeader`), parses with
  `RevenueCatWebhookEventSchema`, dispatches to `billingRepository.handleRevenueCatEvent(event)`.
  401 / 400 / 500 status codes per failure mode. The scaffold-era `/webhooks/stripe` path is not
  part of the target architecture (Stripe events surface through RevenueCat's webhook stream).
- **Client SDK exports:** none from this package (no client SDK surface). tRPC
  `billing.entitlements.get` / `billing.offerings.list` routers in `apps/api` are the server-facing
  surface. Every app uses the RevenueCat client SDK directly for purchase UX (Web SDK on `apps/web`,
  Web Billing on `apps/desktop`, RN SDK on `apps/mobile`); Stripe is the web rail configured inside
  RevenueCat, not an app-level SDK.

## Gaps vs docs

1. ~~**DI key token missing:**~~ ✅ DONE 2026-04-24: `dependencyKeys.global.BILLING_REPOSITORY` added
   to `@t/dependency-injection`; the registrar now binds under the canonical token (local
   `BILLING_REPOSITORY_DEPENDENCY_KEY` export aliases it).
2. ~~**Config schema gap:** `REVENUECAT_WEBHOOK_AUTH_HEADER` is not in `@t/config`'s env schema.~~ ✅
   DONE 2026-04-26: `RevenueCatConfigSchema.webhookAuthHeader` (z.string().min(1)) shipped;
   `apps/api` reads `config.revenueCat.webhookAuthHeader`.
3. ~~**Composition root unwired:**~~ ✅ DONE 2026-04-25: `registerBillingDI` called in
   `apps/api/src/composition.ts#buildContainer()`. ~~*Caveat:* still lazy `asFunction`, so config
   errors only surface at resolve time, not registration time, and won't be caught by the
   composition-root `try/catch`.~~ ✅ DONE 2026-04-26: registrar switched from `asFunction` to
   `asValue` — `RevenueCatBillingImpl` / `StripeBillingImpl` constructors run at registration time,
   so config validation errors now propagate eagerly through the composition-root `try/catch`.
4. ~~**Webhook route unwired:**~~ ✅ DONE 2026-04-26: `POST /api/webhooks/revenuecat` mounted in
   `apps/api/src/index.ts:41` via `createRevenueCatWebhookApp(container)` from
   `apps/api/src/routes/webhooks/revenuecat.ts`. Verifies via `verifyRevenueCatWebhook` from
   `@t/billing`; dispatches `billingRepository.handleRevenueCatEvent`.
5. **Persistence stubbed:** `syncEntitlement` logs only in both impls;
   `StripeBillingImpl.getEntitlements` returns `[]`; `billing_events` idempotency table not
   implemented — blocked on `@t/db` exposing `BillingEventRepository`.
6. **Composite dedup:** `CompositeBillingImpl.getEntitlements` returns raw union with no dedup —
   current effective result is RC-only since Stripe impl returns `[]`.
7. **Downstream (outside package):** tRPC `billing` router (`entitlements.get`, `offerings.list`),
   RevenueCat client SDK wiring on every app (`apps/web` RevenueCat Web SDK, `apps/desktop`
   RevenueCat Web Billing, `apps/mobile` RevenueCat RN `Purchases.configure`), and webhook replay
   integration tests are not yet built. There is no app-level Stripe wiring on any app — Stripe is
   the web rail configured inside RevenueCat only.

## Notes for next agent

- Do not add `process.env` reads inside `packages/billing` — all config flows via `@t/config`
  options bag. This is enforced by convention in the README.
- Stripe userId resolution uses metadata fallback order: `userId` → `user_id` →
  `client_reference_id`; unresolved events log a warning and return `200` (no throw) to prevent
  Stripe retry storms.
- When you wire persistence, implement idempotency on `(provider, event.id)` at the adapter boundary
  before `syncEntitlement` writes — Stripe retries up to 3 days.
- Refund / chargeback paths (`charge.refunded`, RC `CANCELLATION`/`REFUND`) already route to
  `syncEntitlement` as `"cancelled"` — shape is correct, persistence is the only missing piece.
- Webhook routes must read the **raw** request body (Stripe signature verification requires it); do
  not let Hono/tRPC JSON-parse before verification.
- After any change to `packages/billing/**` or `apps/*/billing` wiring, update this file AND
  `docs/prd-status/matrix.md` (maintainer contract in frontmatter).
