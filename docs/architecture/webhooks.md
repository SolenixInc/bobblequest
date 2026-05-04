# Webhooks

Last updated: 2026-04-26

`apps/api` exposes two webhook endpoints. Both are mounted **outside** the `/trpc/*` tree and
**before** the `clerkAuth` middleware in `apps/api/src/index.ts`, because each provider
authenticates with its own signature/shared-secret scheme rather than a Clerk Bearer token. Mixing
`clerkAuth` here would add unnecessary overhead and could silently null out context vars the webhook
handlers don't use.

| Endpoint | Provider | Verifier | Secret env var | Source file |
| --- | --- | --- | --- | --- |
| `POST /api/webhooks/clerk` | Clerk | svix signature (svix-id / svix-timestamp / svix-signature headers) | `CLERK_WEBHOOK_SECRET` | `apps/api/src/routes/webhooks/clerk.ts` |
| `POST /api/webhooks/revenuecat` | RevenueCat | shared-secret `Authorization` header (timing-safe compare) | `REVENUECAT_WEBHOOK_AUTH_HEADER` | `apps/api/src/routes/webhooks/revenuecat.ts` |

Both routes are factory functions that take the DI container:

- `createClerkWebhookApp(container)` — `apps/api/src/routes/webhooks/clerk.ts`
- `createRevenueCatWebhookApp(container)` — `apps/api/src/routes/webhooks/revenuecat.ts`

---

## Mount order in `apps/api/src/index.ts`

```text
1. app.onError(errorHandler)             ← @t/errors global error funnel
2. app.use('*', cors(...))               ← CORS first so OPTIONS pre-flights work
3. app.get('/health', ...)               ← unauthenticated load-balancer probe
4. app.route('/api/webhooks/clerk', ...) ← provider-signed; pre-auth
5. app.route('/api/webhooks/revenuecat', ...) ← provider-signed; pre-auth
6. app.use('/trpc/*', createClerkAuthMiddleware(container)) ← Bearer token auth
7. app.use('/trpc/*', trpcServer({ ... }))                    ← tRPC mount
```

Mount paths are `/api/webhooks/*`. Older docs may use the `/webhooks/*` shorthand — the on-disk path
is `/api/webhooks/*`.

---

## Clerk — `POST /api/webhooks/clerk`

### Signature verification

- Headers: `svix-id`, `svix-timestamp`, `svix-signature`.
- Library: `svix` (kept directly — did not swap to `@clerk/backend/webhooks`). Rationale: less
  churn, the existing 23 webhook tests pass unchanged, and `svix.Webhook(secret).verify(body,
  headers)` is a stable public surface.
- Secret: `CLERK_WEBHOOK_SECRET` — resolved from `container.resolve(CONFIG).auth.clerkWebhookSecret`
  (env fallback `process.env.CLERK_WEBHOOK_SECRET` for tests).
- Raw body required — read **before** any JSON parser.

### Event handling

After verification:

1. Parse with `WebhookEventSchema` from `@t/auth` (Zod discriminated union over `user.created` /
   `user.updated` / `user.deleted`).
2. Dispatch:
   - `user.created` → `UserRepository.create(...)` then `auth.syncFromWebhook(event)`
   - `user.updated` → `UserRepository.findByClerkUserId(id)` + `update(...)` then
     `auth.syncFromWebhook(event)`
   - `user.deleted` → `UserRepository.findByClerkUserId(id)` + `delete(...)` then
     `auth.syncFromWebhook(event)`

`UserRepository` and `auth` (the `AuthProvider` port) are both resolved from the DI container.

### Idempotency posture

- Stateless re-applies — a `user.created` replay is upserted (find-then-create); `user.updated` is a
  write that converges to the latest state; `user.deleted` is a hard-delete that no-ops if the row
  is already gone. No nonce store today.
- Replay protection comes from svix signature verification at the gate; we do not persist `svix-id`
  for cross-request dedup.

### HTTP semantics

| Status | Meaning |
| --- | --- |
| `200` | Stop retrying. Event accepted (or already applied). |
| `400` | Bad request (missing headers, malformed JSON, schema parse failure). svix will not retry. |
| `401` | Signature verification failed. svix will retry. |
| `500` | Repository or `syncFromWebhook` threw. svix retries on its standard backoff. |

---

## RevenueCat — `POST /api/webhooks/revenuecat`

### Signature verification

- RevenueCat does **not** sign with HMAC. It sends a static shared-secret value in the request
  `Authorization` header.
- Library: `verifyRevenueCatWebhook` from `@t/billing`
  (`packages/billing/src/infrastructure/webhookVerifier.ts`), which performs a timing-safe equality
  compare via `crypto.timingSafeEqual` to defeat byte-by-byte comparison side channels.
- Secret: `REVENUECAT_WEBHOOK_AUTH_HEADER` — read from `config.revenueCat.webhookAuthHeader`
  (`@t/config` `RevenueCatConfigSchema.webhookAuthHeader`, `z.string().min(1)`). No bare
  `process.env` reads.
- Raw body is read first (RevenueCat does not require it for verification, but we keep the same
  read-before-parse discipline as Clerk).

### Event handling

After verification:

1. Parse with `RevenueCatWebhookEventSchema` from `@t/billing`.
2. Dispatch via `billingRepository.handleRevenueCatEvent(event)` (resolved from DI). The
   `BillingRepository` impl owns its own idempotency posture — today
   `RevenueCatBillingImpl.syncEntitlement` is a logging stub; once `@t/db` exposes
   `BillingEventRepository`, idempotency will be enforced on `(provider, event.id)` at the adapter
   boundary.

### HTTP semantics

| Status | Meaning |
| --- | --- |
| `200` | Stop retrying. Event accepted. |
| `400` | Bad request (malformed JSON or schema parse failure). RevenueCat will not retry. |
| `401` | Shared-secret comparison failed. RevenueCat will retry. |
| `500` | Repository threw. RevenueCat retries on its standard backoff. |

---

## General principles

- **Verify-before-parse.** Every webhook route reads the raw body, runs verification first, and only
  then parses + dispatches.
- **200 always means "stop retrying."** Once a verified event reaches the dispatch path, even a
  domain-level "ignore" outcome returns `200` to avoid retry storms.
- **4xx is a permanent failure.** Schema parse errors, missing headers, and malformed bodies return
  `400` and do not retry.
- **5xx is transient.** Repo / adapter exceptions return `500` so the provider retries on its
  standard backoff.
- **No nonce store today.** Signature verification is the gate. Per-event idempotency is delegated
  to the dispatch handler (`UserRepository` for Clerk, `BillingRepository` for RevenueCat).
- **DI-first.** Both factories take the container and resolve their dependencies (`AuthProvider`,
  `UserRepository`, `BillingRepository`, `ConfigRepository`) at construction or per-request — never
  via direct `process.env` reads inside the route.

---

## Related docs

- `docs/architecture/apps/api.md` — composition root + tRPC context flow.
- `docs/architecture/platform/auth.md` — Clerk webhook event shape and `users.clerk_user_id` mirror.
- `docs/architecture/platform/billing.md` — RevenueCat event handling, entitlement normalization,
  `verifyRevenueCatWebhook` signature.
- `docs/prd-status/apps/api.md` — wiring status (`Clerk webhook persistence`, `Billing webhook route
  mounted`).
