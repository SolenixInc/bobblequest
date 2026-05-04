# `@t/analytics`

Platform-wide analytics port for the monorepo. Every app (`apps/api`, `apps/web`, `apps/website`,
`apps/desktop`, `apps/mobile`) and every cross-module producer (`@t/billing`, `@t/logging`, `@t/ai`)
depends on this single typed port. One PostHog project is sliced by the reserved super-properties
`$environment` and `$service`. The canonical target-state spec lives in
[`docs/architecture/platform/analytics/analytics.md`](../../docs/architecture/platform/analytics/analytics.md).

## Usage

```ts
import { registerAnalyticsDI } from "@t/analytics";
import { dependencyKeys } from "@t/config";

registerAnalyticsDI(container, { config, environment: "prod", service: "api" });

const tracker = container.resolve(dependencyKeys.global.ANALYTICS);
tracker.capture("signup", userId, { plan: "pro" });
```

## Port surface

`AnalyticsTracker` exposes exactly 11 methods:

| Method | Signature | Purpose |
| --- | --- | --- |
| `capture` | `(event: string, distinctId: string, properties?: Record<string, unknown>, groups?: Record<string, string>) => void` | Capture a generic event for `distinctId`. |
| `captureException` | `(error: Error, distinctId: string, properties?: Record<string, unknown>) => void` | Capture an error as a PostHog `$exception` event. |
| `captureRevenue` | `(event: RevenueEvent) => void` | Capture a revenue event mapped to PostHog's `$revenue`. |
| `captureLlm` | `(event: LlmEvent) => void` | Capture an LLM generation event mapped to PostHog's `$ai_generation`. |
| `identify` | `(distinctId: string, traits?: Record<string, unknown>) => void` | Identify a user and attach traits for subsequent events. |
| `alias` | `(distinctId: string, alias: string) => void` | Alias `distinctId` to `alias` to merge anon â†’ identified. |
| `group` | `(groupType: string, groupKey: string, traits?: Record<string, unknown>) => void` | Stitch the current user into an organization / workspace group. |
| `sessionId` | `() => string` | Return the stable per-tracker session id synchronously. |
| `isFeatureEnabled` | `(key: string, distinctId: string) => Promise<boolean>` | Server-side feature-flag evaluation for `distinctId`. |
| `getAllFlags` | `(distinctId: string) => Promise<Record<string, boolean \| string>>` | Bulk flag evaluation for RSC first-paint hydration. |
| `shutdown` | `() => Promise<void>` | Flush buffered events on graceful shutdown (SIGTERM). |

## NoOp selection rules

`registerAnalyticsDI` picks an implementation per these rules, in order:

| Condition | Result |
| --- | --- |
| `environment === "testing"` | `NoOpAnalyticsTracker` |
| `config.analytics.enabled === false` | `NoOpAnalyticsTracker` |
| `!config.analytics.apiKey` | `NoOpAnalyticsTracker` + `warn` via `@t/logging` |
| otherwise | `PostHogAnalyticsTrackerImpl` |

## Reserved super-properties

The following keys are stamped on every event and caller-supplied values for them are **always
overridden**:

- `$environment` â€” from the tracker's `environment` option.
- `$service` â€” from the tracker's `service` option.
- `$session_id` â€” from the request-scoped wrapper (`X-PostHog-Session` header).
- `distinct_id` â€” from the request-scoped wrapper (`userId ?? $session_id ?? requestId`).
- `request_id` â€” from middleware.
- `$group` â€” org / workspace key when present.

## Request-scoped exception capture

`RequestAnalyticsTracker` supports two call shapes for `captureException`. Use whichever matches the
consumer's context:

### Shape 1 — explicit `distinctId` (original, back-compat)

Use when the caller has the user id at hand and wants full control:

```ts
tracker.captureException(error, 'user-123', { statusCode: 500, route: '/api/jobs' })
```

### Shape 2 — context-only (request-scoped shorthand, recommended for middleware/errorHandler)

Use when the tracker is already bound to a request scope — `distinctId` is derived automatically:

```ts
// In @t/errors errorHandler — no manual distinctId threading required
tracker.captureException(error, { requestId, statusCode, fileName, userId })
```

The `distinctId` resolution order mirrors the tracker constructor:

```text
userId (from Clerk session) -> sessionIdFromHeader (X-PostHog-Session) -> requestId
```

`requestId` is always present (injected by middleware), so `distinctId` is always resolved. There is
no additional fallback beyond `requestId`.

The context object is merged with the standard request super-properties (`distinct_id`,
`$session_id`, `request_id`, `$group`) before the event is forwarded to the parent tracker.

> `AnalyticsTracker` (the non-request-scoped port) retains only the original 3-arg shape — it has no
> implicit user context, so the explicit `distinctId` is required there.

## Testing

Tests live under `tests/` mirroring the `src/` structure. Run with Vitest:

```sh
vitest run --filter @t/analytics
```
