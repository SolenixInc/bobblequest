# Reference: environment variables

## What this file is for

Single-page inventory of every environment variable consumed across all apps and packages in this
monorepo. Use it to understand what to set when bootstrapping a new environment, debugging a
boot-time validation failure, or reviewing secrets rotation scope.

## When to update it

Update this file whenever a schema file under `packages/config/entities/schemas/` gains, removes,
or changes a variable. The source of truth is always the Zod schema — this doc is a hand-curated
projection of it.

## How to regenerate

This document is hand-curated for v1. Source of truth is `packages/config/entities/schemas/*.ts`.
Each `resolveX()` function in that directory shows exactly which `process.env` keys map to which
schema fields. Future TODO: generate this table via codegen (e.g., ts-morph introspection of Zod
schemas at CI time).

---

## API (`apps/api`)

Validated by `ConfigValuesSchema` (full schema) at composition-root boot.
See `apps/api/.env.example` for a complete template.

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | no | `development` | api | Runtime environment: `development`, `local`, `testing`, `production` |
| `PORT` | no | `8000` | api | TCP port the Hono server binds to |
| `LOG_LEVEL` | no | `debug` | api | Minimum log level: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly` |
| `AI_SERVICE_URL` | yes | — | api | Internal AI service endpoint URL |
| `METRICS_AUTH_TOKEN` | yes | — | api | Bearer token required to access `GET /metrics` |
| `SYSTEM_API_KEY` | yes | — | api | Key for internal service-to-service authentication |
| `CORS_ORIGINS` | no | `http://localhost:3001,http://localhost:8081` | api | Comma-separated list of allowed CORS origins |
| `CRON_SECRET` | yes | — | api | Bearer token checked on `POST /api/cron/*` endpoints |
| `DATABASE_URL` | yes | — | api | Full Postgres connection URL (e.g. `postgres://user:pass@host:5432/db`) |
| `DATABASE_MAX_CONNECTIONS` | no | `10` | api | Postgres connection pool size |
| `DATABASE_PREPARE` | no | `false` | api | Enable prepared statements (`true`/`false`; keep `false` behind pgbouncer) |
| `REDIS_URL` | no | — | api | Full Redis connection URL — takes precedence over discrete fields. Inside Docker use `redis://:password@redis:6379` (service name); for host-side dev use `redis://:password@localhost:6380` (mapped port). |
| `REDIS_HOST` | no | `localhost` | api | Redis host — ignored when `REDIS_URL` is set |
| `REDIS_PORT` | no | `6379` | api | Redis port |
| `REDIS_PASSWORD` | no | — | api | Redis password (omit for unauthenticated local instances) |
| `REDIS_TLS` | no | `false` | api | Enable TLS for Redis connection |
| `REDIS_DB` | no | `0` | api | Redis database index |
| `POSTHOG_API_KEY` | yes | — | api | PostHog public Project API Key for server-side event capture |
| `POSTHOG_PERSONAL_API_KEY` | no | — | api | PostHog personal key for server-side feature flag evaluation |
| `POSTHOG_HOST` | no | — | api | PostHog instance host URL (e.g. `https://us.i.posthog.com`) |
| `POSTHOG_ENABLED` | no | `true` | api | Set `false` in CI/local to suppress PostHog event capture |
| `CLERK_PUBLISHABLE_KEY` | no | — | api | Clerk client-side publishable key (not used for server verification) |
| `CLERK_SECRET_KEY` | no | — | api | Clerk server-only secret key — used by `@clerk/backend` for JWKS + API calls |
| `CLERK_WEBHOOK_SECRET` | no | — | api | Svix signing secret for verifying `POST /api/webhooks/clerk` payloads |
| `STRIPE_API_KEY` | yes | — | api | Stripe secret key (web payment rail behind RevenueCat) |
| `STRIPE_REDIRECT_DOMAIN` | yes | — | api | Base domain for Stripe checkout return URLs |
| `STRIPE_WEBHOOK_SECRET` | yes | — | api | Secret for validating incoming Stripe webhook signatures |
| `APPLE_PROD_URL` | yes | — | api | Production URL for Apple receipt validation |
| `APPLE_SANDBOX_URL` | yes | — | api | Sandbox URL for Apple receipt validation |
| `APPLE_SHARED_SECRET` | yes | — | api | Shared secret authenticating requests to Apple's servers |
| `APP_STORE_BUNDLE_ID` | yes | — | api | App bundle identifier registered in App Store Connect |
| `APP_STORE_ENVIRONMENT` | yes | — | api | `Sandbox` or `Production` |
| `ANDROID_PUBLISHER_URL` | yes | — | api | URL for the Android publisher API |
| `CORE_REVENUE_CAT_API_KEY` | yes | — | api | RevenueCat server-side API key |
| `CORE_REVENUE_CAT_PROJECT_ID` | yes | — | api | RevenueCat project ID |
| `CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID` | yes | — | api | RevenueCat entitlement ID for the primary app entitlement |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | yes | — | api | Shared-secret value sent in `Authorization` header of RevenueCat webhooks |

---

## Web (`apps/web`)

Validated by `WebConfigValuesSchema` + `WebClientConfigSchema` at composition-root boot.
See `apps/web/.env.example` for a complete template.

> **Docker build note:** `NEXT_PUBLIC_*` vars are inlined by the Next.js compiler during
> `next build`. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_TRPC_URL` are required by
> `WebClientConfigSchema` (`min(1)` and `.url()` validators). Both must be supplied as
> `docker compose build` args — `env_file` is runtime-only. `apps/web/Dockerfile` declares them
> as `ARG`s; `docker-compose.yml` passes them via `build.args`. Defaults are safe placeholders
> for local/CI builds.
>
> **Server-side env at build time:** `next build` runs `layout.tsx` during page-data collection,
> which imports `logger` → `getContainer()` → `registerAnalyticsDI()`. Without a real
> `POSTHOG_API_KEY`, this throws unless `POSTHOG_ENABLED=false` is set. The Dockerfile sets
> `POSTHOG_ENABLED=false` as a build-time ARG so the NoOp analytics path is selected during build.
> At runtime the container's `env_file` overrides this to the desired value.

**Server-side (Next.js server runtime):**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | no | `development` | web | Runtime environment |
| `LOG_LEVEL` | no | `debug` | web | Minimum log level |
| `PORT` | no | `8000` | web | Port (typically overridden by Next.js) |
| `CLERK_SECRET_KEY` | no | — | web | Clerk server-only secret key |
| `CLERK_WEBHOOK_SECRET` | no | — | web | Clerk webhook svix signing secret |

**Client-side (`NEXT_PUBLIC_*`, inlined at build time and passed as Docker build ARGs):**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes (build-time ARG) | `pk_test_placeholder_replace_me` (dev default) | web | Clerk publishable key for browser SDK init |
| `NEXT_PUBLIC_TRPC_URL` | yes (build-time ARG) | `http://localhost:3000/trpc` (dev default) | web | tRPC base URL inlined at build time |
| `NEXT_PUBLIC_POSTHOG_KEY` | no | `""` (analytics disabled) | web | PostHog project API key; absent/empty disables analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | `https://us.i.posthog.com` | web | PostHog instance host URL |
| `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` | no | `""` (NoOp tracker) | web | RevenueCat public key; absent/empty → NoOp billing tracker |
| `NEXT_PUBLIC_ENVIRONMENT` | no | `development` | web | Runtime environment exposed to browser bundle |
| `POSTHOG_API_KEY` | no | — | web | PostHog API key for server-side composition root. Required unless `POSTHOG_ENABLED=false`. |
| `POSTHOG_ENABLED` | no | `true` | web | Set `false` to select NoOp analytics tracker without requiring `POSTHOG_API_KEY`. Dockerfile sets this to `false` at build time so `next build` succeeds without real keys. |

---

## Website (`apps/website`)

Validated by `WebsiteConfigSchema` at first request (not at build time).
See `apps/website/.env.example` for a complete template.

> **Build-time vs runtime classification:**
>
> `NEXT_PUBLIC_*` vars are inlined by the Next.js compiler at `next build` and must be supplied as
> `docker compose build` args (see `apps/website/Dockerfile`). They are correct as build args.
>
> `SITE_URL` is a **server-only** var (no `NEXT_PUBLIC_` prefix). It is read at **request time**
> via `generateMetadata()` in `apps/website/src/app/layout.tsx` (protected by `await connection()`
> from `next/server`). It must NOT be a build arg — pass it in `docker-compose.yml`'s `environment:`
> block so the same Docker image is portable across dev/staging/prod without a rebuild.
>
> `SKIP_ENV_VALIDATION=1` is set as a build arg in `apps/website/Dockerfile` so `next build`
> succeeds without real env vars. `resolveWebsiteConfig` returns a stub when this flag is set and
> `SITE_URL` is absent. Real validation throws clearly on first request when `SITE_URL` is missing.

**Server-side (evaluated at request time):**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `SITE_URL` | yes (runtime) | `http://localhost:3002` | website | Canonical URL of the deployed site. Server-only. Read at request time. Omitting causes a clear error on first request, not at build time. |

**Client-side (`NEXT_PUBLIC_*`, inlined at build time and passed as Docker build ARGs):**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | no | `""` (analytics disabled) | website | PostHog project API key — absent/empty → NoOp tracker, app still boots |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | `https://us.i.posthog.com` | website | PostHog instance host URL |

---

## Mobile (`apps/mobile`)

Validated by `MobileConfigValuesSchema` at Expo composition-root init.
See `apps/mobile/.env.example` for a complete template.
`EXPO_PUBLIC_*` vars are inlined by the Metro bundler and safe for device bundles.

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | no | `development` | mobile | Runtime environment |
| `LOG_LEVEL` | no | `debug` | mobile | Minimum log level |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | — | mobile | Clerk publishable key for Expo SDK init |
| `EXPO_PUBLIC_API_URL` | no | `http://localhost:3000` | mobile | tRPC API base URL |
| `EXPO_PUBLIC_POSTHOG_KEY` | yes | — | mobile | PostHog project API key |
| `EXPO_PUBLIC_POSTHOG_HOST` | no | `https://us.i.posthog.com` | mobile | PostHog instance host URL |
| `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` | no | — | mobile | RevenueCat Apple (iOS) API key |
| `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` | no | — | mobile | RevenueCat Google (Android) API key |

---

## Desktop (`apps/desktop`)

Two schemas govern desktop: `DesktopConfigValuesSchema` (main process) and
`DesktopClientConfigSchema` (renderer, Vite-injected).
See `apps/desktop/.env.example` for a complete template.

**Main process:**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | no | `development` | desktop | Runtime environment |
| `LOG_LEVEL` | no | `debug` | desktop | Minimum log level |
| `PORT` | no | `8000` | desktop | Port (used by embedded server if present) |
| `CLERK_PUBLISHABLE_KEY` | no | — | desktop | Clerk publishable key (main process; preferred over `VITE_` form) |
| `CLERK_SECRET_KEY` | no | — | desktop | Clerk server-only secret key |
| `CLERK_WEBHOOK_SECRET` | no | — | desktop | Clerk webhook svix signing secret |
| `POSTHOG_API_KEY` | yes | — | desktop | PostHog API key for main-process capture |
| `POSTHOG_HOST` | no | — | desktop | PostHog instance host URL |

**Renderer (Vite-injected `VITE_*`):**

| Name | Required | Default | Scope | Description |
| --- | --- | --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | — | desktop-renderer | Clerk publishable key for renderer SDK init |
| `VITE_API_URL` | yes | — | desktop-renderer | tRPC API base URL for renderer |
| `VITE_REVENUECAT_PUBLIC_API_KEY` | yes | — | desktop-renderer | RevenueCat public API key for in-app purchases |
| `VITE_POSTHOG_KEY` | no | — | desktop-renderer | PostHog API key (renderer fallback for `POSTHOG_API_KEY`) |
| `VITE_POSTHOG_HOST` | no | — | desktop-renderer | PostHog instance host URL (renderer fallback) |

---

## Database (`packages/db`)

`packages/db` does not read its own env vars — it receives a `DbConfig` injected by the consuming
app's composition root. The vars live in `apps/api/.env.example`.

_No additional vars beyond those listed under API above._

---

## Shared / cross-cutting

Variables that appear in multiple schemas or span more than one app.

| Name | Apps | Description |
| --- | --- | --- |
| `ENVIRONMENT` | api, web, mobile, desktop, website | Runtime tier; mapped through `EnvironmentSchema` |
| `LOG_LEVEL` | api, web, mobile, desktop | Minimum log level; each app defaults to `debug` |
| `POSTHOG_API_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_KEY` / `VITE_POSTHOG_KEY` | all | Same PostHog project key, prefixed per platform's build-time inlining convention |
| `POSTHOG_HOST` / `NEXT_PUBLIC_POSTHOG_HOST` / `EXPO_PUBLIC_POSTHOG_HOST` / `VITE_POSTHOG_HOST` | all | PostHog instance host; each defaults to `https://us.i.posthog.com` |
| `CLERK_PUBLISHABLE_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | web, mobile, desktop | Same Clerk key, prefixed per platform |
| `CLERK_SECRET_KEY` | api, web | Server-only; never ship to browser or device bundles |
| `NEXT_PUBLIC_TRPC_URL` / `EXPO_PUBLIC_API_URL` / `VITE_API_URL` | web, mobile, desktop | tRPC base URL pointing at `apps/api` (port 3000); prefixed per platform |

---

**Last reviewed:** 2026-04-30 — owner: TBD
