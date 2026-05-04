# `@t/analytics` — Platform Analytics Spec

## Purpose

A single, typed PostHog port used by every app (`apps/api`, `apps/web`, `apps/website`,
`apps/mobile`, `apps/desktop`) and every cross-module producer (`@t/billing`, `@t/logging`,
`@t/ai`). One PostHog project; sliced by `$environment` Ã— `$service` reserved super-properties.

This doc is the **target state**. It does not describe current code — for current-vs-target gap
analysis, see the phase checklists in this folder. It is a fresh rewrite that supersedes the older
`docs/architecture/platform/analytics.md` at the parent folder.

## Architecture

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐
│  apps/web    │  │ apps/website │  │ apps/desktop │  │   apps/mobile   │
│  (Next.js)   │  │  (Next.js)   │  │ (Electron)   │  │ (RN / Expo)     │
│  posthog-js  │  │  posthog-js  │  │  posthog-js  │  │ posthog-rn      │
│ autocap      │  │ pageviews    │  │ autocap      │  │ autocap         │
│ replay       │  │ replay       │  │ replay       │  │ replay          │
│ heatmap      │  │ surveys      │  │ heatmap      │  │ surveys         │
│ surveys      │  │              │  │ surveys      │  │ flags eval      │
│ flags (c+s)  │  │              │  │ flags (c+s)  │  │                 │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘
       │                 │                 │                   │
       │   HTTPS + tRPC + X-PostHog-Session header             │
       └─────────────────┴─────────────────┴───────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ apps/api  (Bun · Hono · tRPC)                                       │
│   composition root: registerAnalyticsDI(container, {                │
│     config, environment, service: "api"                             │
│   })                                                                │
│   per-request middleware resolves RequestAnalyticsTracker           │
│     stamps: distinct_id · $session_id · $environment · $service ·   │
│             request_id · $group                                     │
└─────────────────────────────────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ port: AnalyticsTracker (abstract class)                             │
│   capture · captureException · captureRevenue · captureLlm          │
│   identify · alias · group · sessionId                              │
│   isFeatureEnabled · getAllFlags · shutdown                         │
└─────────────────────────────────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ impl: PostHogAnalyticsTrackerImpl                                   │
│   ctor({ environment, service, apiKey, host, enabled })             │
│   throws TypeError if environment or service missing                │
│   stamps $environment / $service on every event (RESERVED)          │
│   host from AnalyticsConfigSchema                                   │
└─────────────────────────────────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PostHog (one project · sliced by $environment + $service)           │
│   product · errors · LLM · revenue · web-a · replay · heat ·        │
│   surveys · flags                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Port Surface

`AnalyticsTracker` (abstract class) exposes **exactly 11** methods:

| Method | Signature | Purpose |
| --- | --- | --- |
| `capture` | `(event: string, distinctId: string, properties?: Record<string, unknown>, groups?: Record<string, string>) => void` | Generic event |
| `captureException` | `(error: Error, distinctId: string, properties?: Record<string, unknown>) => void` | Error events → PostHog `$exception` |
| `captureRevenue` | `(event: RevenueEvent) => void` | Revenue events → PostHog `$revenue` |
| `captureLlm` | `(event: LlmEvent) => void` | LLM events → PostHog `$ai_generation` |
| `identify` | `(distinctId: string, traits?: Record<string, unknown>) => void` | Identify user with traits |
| `alias` | `(distinctId: string, alias: string) => void` | Merge anon → identified |
| `group` | `(groupType: string, groupKey: string, traits?: Record<string, unknown>) => void` | `$group` stitching (org, workspace) |
| `sessionId` | `() => string` | Current session id; generates if absent |
| `isFeatureEnabled` | `(key: string, distinctId: string) => Promise<boolean>` | Server-side flag eval |
| `getAllFlags` | `(distinctId: string) => Promise<Record<string, boolean \| string>>` | Bulk flag eval for RSC bootstrap |
| `shutdown` | `() => Promise<void>` | Flush buffered events (SIGTERM) |

## Construction Contract

> Imports use `@t/*` aliases (mapped to `./packages/*/src` in `tsconfig.base.json`). Inside the
> package, all `import` paths use those aliases — never relative cross-package paths, and never
> Deno-style `@scope` or `@/...` specifiers.

```ts
type AnalyticsTrackerOptions = {
  environment: "development" | "local" | "testing" | "production"; // canonical EnvironmentSchema enum — required
  service: "api" | "web" | "website" | "mobile" | "desktop" | "worker"; // required
  apiKey?: string;
  host?: string;     // default from AnalyticsConfigSchema
  enabled?: boolean; // false → NoOp
};
```

- `new Impl({})` → throws `TypeError("environment required")`
- `new Impl({ environment: "prod" })` → throws `TypeError("service required")`
- Every event auto-stamps (RESERVED — callers cannot override):
  - `$environment = options.environment`
  - `$service = options.service`

## Reserved Super-Properties

These are stamped on every event and **stripped** from caller-supplied `props`:

| Key | Stamped by | Notes |
| --- | --- | --- |
| `$environment` | parent tracker | from constructor option |
| `$service` | parent tracker | from constructor option |
| `$session_id` | request-scoped wrapper | from `X-PostHog-Session` header |
| `distinct_id` | request-scoped wrapper | `userId ?? $session_id ?? requestId` |
| `request_id` | request-scoped wrapper | from middleware |
| `$group` | request-scoped wrapper | org / workspace key when present |

## DI Registrar

```ts
registerAnalyticsDI(container, {
  config: ConfigRepository,   // @t/config
  environment: Environment,   // from RAILWAY_ENVIRONMENT etc.
  service: Service,           // compile-time per app
});
```

Selection, in order:

1. `environment === "testing"` → `NoOpAnalyticsTracker`
2. `config.analytics.enabled === false` → `NoOpAnalyticsTracker`
3. `!config.analytics.apiKey` → `NoOpAnalyticsTracker` + `warn` via `@t/logging`
4. otherwise → `PostHogAnalyticsTrackerImpl`

Lifetime: **singleton**. Key: `dependencyKeys.global.ANALYTICS` (owned by
`@t/dependency-injection`). The request-scoped wrapper binds under
`dependencyKeys.request.REQUEST_ANALYTICS` with `scoped` lifetime.

## Config Schema (`@t/config`)

```ts
AnalyticsConfigSchema = z.object({
  apiKey:          z.string(),           // public project key
  personalApiKey:  z.string(),           // for server-side flag eval
  host:            z.string().url(),     // e.g. https://us.i.posthog.com
  enabled:         z.boolean().default(true),
});
```

Env var mapping:

- `POSTHOG_API_KEY` → `apiKey`
- `POSTHOG_PERSONAL_API_KEY` → `personalApiKey`
- `POSTHOG_HOST` → `host`
- `POSTHOG_ENABLED` → `enabled`

## Request-Scoped Wrapper

`RequestAnalyticsTracker` (abstract class) wraps `AnalyticsTracker` and is constructed per HTTP
request. Every method stamps the reserved super-properties listed above.

## Cross-Module Producers (Phase 2+, out of scope for Phase 1)

- `@t/billing` → `tracker.captureRevenue(...)` on RevenueCat webhook events (`INITIAL_PURCHASE` /
  `RENEWAL` / `REFUND` / `CANCELLATION`). RevenueCat is the source of truth for revenue; Stripe sits
  behind RevenueCat as the web rail and does not emit app-level revenue events. (Extends existing
  `packages/billing/`.)
- `@t/logging` → `tracker.captureException(...)` on every `error`-level log (extends existing
  `packages/logging/`)
- `@t/ai` → `tracker.captureLlm(...)` per model call (package does not yet exist; Phase 2 scaffolds
  `packages/ai/`)
- `apps/api` graceful-stop → `tracker.shutdown()` on SIGTERM

## Dashboard Queries Unlocked

With `$environment` + `$service` + the full port surface, these become answerable:

- “error rate in development web over last 24h” — `$exception` filtered by
  `$environment=”development”` and `$service=”web”`
- "weekly ARR by service (web vs mobile vs desktop)" — `$revenue` grouped by `$service` (all revenue
  flows through RevenueCat, sliced by the originating `$service`)
- "cost of gpt-4 calls by feature flag cohort" — `$ai_generation` joined with flag cohort
- "replay of a failed checkout" — Session Replay filtered by event
- "NPS survey only to prod users on web" — survey targeting on `$environment="prod"` +
  `$service="web"`
- "feature flag X rollout vs conversion" — `getAllFlags` + cohort split
