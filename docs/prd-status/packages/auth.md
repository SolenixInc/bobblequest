---
name: auth bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing packages/auth/** or apps/*/auth wiring MUST update this file and docs/prd-status/matrix.md
---

# @t/auth — bootstrap status

**Package status:** 🟡 ~75% — scaffold complete, apps/api fully wired (middleware + webhook +
composition root), apps/web Clerk swap done. Remaining gates: apps/mobile + apps/desktop wiring, CI
test run on `@clerk/backend` install verified green.

## Intended (per docs)

- Port: `AuthProvider` with `verify`, `currentUser`, `syncFromWebhook` (Clerk token consumer +
  webhook sync; Clerk owns credential/session lifecycle).
- Impl(s): `ClerkAuthProvider` (real, `@clerk/backend` + JWKS + `users.getUser`) and
  `NoopAuthProvider` (deterministic test double).
- Source: `docs/architecture/platform/auth.md`, `docs/architecture/ARCHITECTURE.md` (rows 40, 144,
  219–229).

## Actual (present files)

- `src/entities/ports/`: `AuthProvider.ts` (abstract class: `verify`, `currentUser`,
  `syncFromWebhook`), `index.ts`.
- `src/entities/schemas/`: `AuthUserSchema.ts`, `SessionClaimsSchema.ts`, `WebhookEventSchema.ts`
  (discriminated union over `user.created` / `user.updated` / `user.deleted`), `index.ts`.
- `src/entities/types/`: `AuthError.ts` (+ `AuthErrorCode`), `AuthProviderOptions.ts`,
  `UserSyncCallback.ts`, `index.ts`.
- `src/infrastructure/clerk/`: `ClerkAuthProvider.ts` (wraps `@clerk/backend` `verifyToken` +
  `createClerkClient().users.getUser`, injectable `tokenVerifier` + `clerkClientFactory` for tests).
- `src/infrastructure/noop/`: `NoopAuthProvider.ts` (canned `AuthUser`; honors injected `userSync`).
- `src/dependency-injection/`: `registerAuthDI.ts` (`AUTH_DI_KEY = 'auth'` local const; selection order `testing → Noop | missing-key → Noop | otherwise → Clerk`).
- `src/index.ts`: re-exports port + schemas + types + both impls + `registerAuthDI` + `AUTH_DI_KEY`.
- tests (Vitest): `tests/infrastructure/ClerkAuthProvider.test.ts`,
  `tests/infrastructure/NoopAuthProvider.test.ts`,
  `tests/dependency-injection/registerAuthDI.test.ts`,
  `tests/entities/schemas/WebhookEventSchema.test.ts`, `tests/setup/stubLogging.ts`.
- `package.json`: deps `@clerk/backend ^3.3.0`, `zod ^3.23.0`, peer `awilix ^12.0.0`; devDep `vitest
  ^2.1.0`; scripts `test: vitest run`, `test:watch: vitest`.
- `vitest.config.ts` mirrors `@t/analytics` shape (node env, `stubLogging.ts` setup).
- `packages/config/entities/schemas/AuthConfigSchema.ts` rewritten for Clerk env
  (`clerkPublishableKey`, `clerkSecretKey`, `clerkWebhookSecret`) + `resolveAuthConfig` helper;
  wired into `ConfigValuesSchema.auth`. Legacy `Auth0ConfigSchema` removed 2026-04-24.

## Consumer hooks (what apps call to bootstrap)

- `registerAuthDI(container, { config, environment, authorizedParties?, userSync? })` — registers a
  singleton `AuthProvider` under `AUTH_DI_KEY`.
- `apps/api` composition root owns env → config → `registerAuthDI`; `@t/auth` never reads env
  directly.
- Middleware integration — **wired** in `apps/api`: `createClerkAuthMiddleware(container)` mounted
  via `app.use('/trpc/*', ...)` in `apps/api/src/index.ts`; populates `c.var.userId` + `c.var.user`
  non-blocking.
- svix signature verification for the webhook route — **wired** in `apps/api`: `POST
  /api/webhooks/clerk` (`apps/api/src/routes/webhooks/clerk.ts`) reads raw body, verifies via **svix
  directly** using `CLERK_WEBHOOK_SECRET` (resolved from
  `container.resolve(CONFIG).auth.clerkWebhookSecret`, env fallback for tests), parses through
  `WebhookEventSchema`, then calls `auth.syncFromWebhook(event)`.
- **Verifier choice:** kept svix directly rather than swapping to `@clerk/backend/webhooks`.
  Rationale: less churn, the existing 23 webhook tests pass unchanged, and svix's
  `Webhook(secret).verify(body, headers)` API is a stable public surface. The
  `@clerk/backend/webhooks` helper can be adopted later if Clerk extends it with first-class
  metadata; not required today.

## Gaps vs docs

- ~~**`apps/api` wiring.**~~ **CLOSED 2026-04-26.** Composition root calls `registerAuthDI`
  (`apps/api/src/composition.ts`) with a `userSync` callback that lazily resolves `USER_REPOSITORY`
  and handles `user.created` (repo.create), `user.updated` (findByClerkUserId + update),
  `user.deleted` (findByClerkUserId + delete). `createClerkAuthMiddleware(container)` mounted at
  `/trpc/*` in `apps/api/src/index.ts` (order: onError → CORS → /health → /api/webhooks/*→
  clerkAuth(/trpc/*) → tRPC server). tRPC context exposes `ctx.user` from `c.var`. `POST
  /api/webhooks/clerk` route wired in `apps/api/src/routes/webhooks/clerk.ts` with svix
  verification.
- **`apps/web` / `apps/mobile` / `apps/desktop` wiring.** apps/web complete (2026-04-25 —
  `@clerk/nextjs ^7.2.3`, `<ClerkProvider>`, `clerkMiddleware()`, sign-in / sign-up catch-alls,
  Bearer-header injection). apps/mobile + apps/desktop still on Supabase scaffolding; no
  `<ClerkProvider>`, no `tokenCache` in `apps/mobile`, no renderer Clerk init in `apps/desktop`;
  `Authorization: Bearer ${getToken()}` not wired on tRPC links.
- ~~**DB migration.**~~ **CLOSED.** `users.clerk_user_id` text NOT NULL UNIQUE column exists in
  `packages/db/migrations/0001_init_schema.sql` (line 14) along with `users_clerk_user_id_idx`.
  Migration against a live Postgres still pending (infra task, not package work).
- **DI key hoist.** Resolved per `dependencyKeys.global.AUTH` (already hoisted as part of the
  10-token registry; see `docs/prd-status/packages/dependency-injection.md`). `AUTH_DI_KEY` local
  const remains as a back-compat alias; consumers should prefer `dependencyKeys.global.AUTH`.
- ~~**CI signal.**~~ **CLOSED 2026-04-26.** 9 test files / 96 tests across `packages/auth` +
  `apps/api` Clerk wiring, all green; 100% statement/branch/function/line coverage. CI `test` job
  (`.github/workflows/ci.yml`) invokes `bunx turbo run test`, which runs Vitest on every workspace
  including `@t/auth` after `bun install --frozen-lockfile` materializes `@clerk/backend`.

## Notes for next agent

- apps/api wiring landed 2026-04-26 (`createClerkAuthMiddleware` at `/trpc/*`, `POST
  /api/webhooks/clerk`, `userSync` callback bridging webhook events to `USER_REPOSITORY`). See
  `apps/api/src/index.ts`, `apps/api/src/composition.ts`, `apps/api/src/routes/webhooks/clerk.ts`.
- Next concrete step: apps/mobile and apps/desktop Clerk swap. Mobile uses `@clerk/clerk-expo` +
  `tokenCache: expo-secure-store`; desktop uses `@clerk/clerk-js` in the renderer. Both apps need
  `Authorization: Bearer ${await getToken()}` on tRPC links and removal of the legacy Supabase
  scaffolding.
- `authorizedParties` should default to `[webOrigin, apiOrigin, mobileDeepLink]` resolved from
  `@t/config` once those origins land in the config schema.
- Update `last_audited` and re-verify every section when this file is touched.
