# @t/config

The single safe way to read `process.env` in this monorepo. Every required variable is declared in a
Zod schema, validated at construction, and surfaced through a narrow `ConfigRepository` port. This
package is the canonical clean-architecture template — every other platform module mirrors its
folder shape.

## Install

Already a workspace package:

```json
"dependencies": {
  "@t/config": "workspace:*"
}
```

## Schema overview

14 schemas under `entities/schemas/`, grouped by concern:

| Group | Schemas |
| --- | --- |
| Core | `EnvironmentSchema`, `SystemConfigSchema`, `ConfigValuesSchema` (composite) |
| Auth / Identity | `AuthConfigSchema` |
| Analytics | `PostHogConfigSchema`, `AnalyticsConfigSchema` |
| Billing | `RevenueCatConfigSchema`, `StripeConfigSchema` |
| Mobile stores | `AppleConfigSchema`, `AppStoreConfigSchema`, `AndroidConfigSchema` |
| Infrastructure | `LoggingConfigSchema`, `RedisConfigSchema` |
| Website | `WebsiteConfigSchema` |

`WebConfigValuesSchema` is a web-scoped subset (system + auth only) for consumers that don't need
API-only vars at startup.

`WebsiteConfigSchema` is a website-scoped schema for `apps/website`. It declares `siteUrl`
(required) and an optional `posthog` block. Use `resolveWebsiteConfig(process.env)` in your
composition root, or register via `registerConfigRepo(container, { schema: ... })` with a custom
schema that includes `WebsiteConfigSchema`.

`EnvironmentSchema` canonical values: `"development" | "local" | "testing" | "production"`, default `"development"`. `staging` was removed 2026-04-26.

## SystemConfigSchema environment variables

| Env var | Field | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | `environment` | `"development"\|"local"\|"testing"\|"production"` | `"development"` | Canonical 4-value enum |
| `PORT` | `port` | `number` | `8000` | Port the API server listens on |
| `LOG_LEVEL` | `logLevel` | `"error"\|"warn"\|"info"\|"http"\|"verbose"\|"debug"\|"silly"` | `"debug"` | Winston log level |
| `CORS_ORIGINS` | `corsOrigins` | `string[]` | `["http://localhost:3000","http://localhost:8081"]` | Comma-separated in env; parsed to array at boot |
| `AI_SERVICE_URL` | `aiServiceUrl` | `string` | — | Internal AI service endpoint |
| `METRICS_AUTH_TOKEN` | `metricsAuthToken` | `string` | — | Guards the `/metrics` endpoint |
| `SYSTEM_API_KEY` | `systemApiKey` | `string` | — | Internal service-to-service auth key |
| `CRON_SECRET` | `cronSecret` | `string` | — | Token required to trigger cron endpoints via HTTP |

`isLocal` is **derived** (not read from env): `true` when `environment` is `"local"` or
`"development"`.

## How `ConfigRepositoryImpl` validates env

1. At construction (`new ConfigRepositoryImpl(options?)`), the impl calls
   `schema.parse(process.env)` against the full `ConfigValuesSchema` (or a consumer-supplied schema
   passed via `options.schema`). If any required var is missing or invalid, it throws immediately —
   fail-fast at boot.
2. Each subsystem getter (e.g. `config.revenueCat`) re-parses only its own slice of `process.env`
   via `_buildRawForSchema()`. This provides a second fail-fast guard if a getter is called before
   the impl was constructed with the matching schema.

## Registering via DI

```ts
import { registerConfigRepo } from '@t/config'

// In your composition root — call this first, before any other register*DI:
registerConfigRepo(container)

// For web consumers that don't need API-only vars:
import { WebConfigValuesSchema } from '@t/config'
registerConfigRepo(container, { schema: WebConfigValuesSchema })
```

`registerConfigRepo` binds a `ConfigRepositoryImpl` singleton under `dependencyKeys.global.CONFIG`.
Resolve it as:

```ts
const config = container.resolve<ConfigRepository>('CONFIG')
const webhookHeader = config.revenueCat?.webhookAuthHeader
```

## How to add a new schema

1. Create `entities/schemas/MyThingConfigSchema.ts` — one `z.object({...})` export.
2. Add the schema to `ConfigValuesSchema.ts` (and `WebConfigValuesSchema.ts` if web consumers need
   it).
3. Add a getter to `entities/ports/ConfigRepository.ts` and implement it in
   `infrastructure/ConfigRepositoryImpl.ts` via `_buildRawForSchema`.
4. Add the Zod-inferred type to `entities/types/ConfigTypes.ts`.
5. Add a Vitest spec under `entities/schemas/__tests__/MyThingConfigSchema.test.ts` covering: valid
   env parses, missing required field throws, invalid type throws.
6. Update `docs/architecture/platform/config.md` and `docs/prd-status/packages/config.md`.

## Running tests

```sh
cd packages/config
bun run test           # vitest run (138 tests, 100% coverage)
bun run test:coverage  # vitest run --coverage
```
