import type { LlmEvent } from '../types/LlmEvent.ts'
import type { RevenueEvent } from '../types/RevenueEvent.ts'

/**
 * Request-scoped wrapper around an `AnalyticsTracker`. Constructed per HTTP
 * request by middleware. Mirrors the parent's 11-method surface EXACTLY —
 * adds no new methods — and stamps the per-request reserved super-properties
 * (`distinct_id`, `$session_id`, `request_id`, `$environment`, `$service`,
 * `$group`) into every outbound call before delegating to the parent tracker.
 *
 * Callers should treat this as the same port as `AnalyticsTracker`; the only
 * difference is that they no longer have to thread `distinctId` and request
 * context through every call site.
 */
export abstract class RequestAnalyticsTracker {
  /**
   * Capture a generic event for the current request's resolved
   * `distinct_id`. Per-request super-properties are merged into the
   * outbound payload — caller-supplied reserved keys are stripped.
   */
  abstract capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void

  /**
   * Capture an error as `$exception` for this request, with `request_id`
   * and `$session_id` stamped onto the event for replay correlation.
   *
   * **Two call shapes are valid:**
   *
   * 1. Explicit `distinctId` (original shape — preserved for back-compat):
   *    ```ts
   *    tracker.captureException(error, 'user-123', { statusCode: 500 })
   *    ```
   *
   * 2. Context-only (request-scoped shorthand — NEW):
   *    ```ts
   *    tracker.captureException(error, { requestId, statusCode, fileName })
   *    ```
   *    `distinctId` is derived automatically from the scoped user bound at
   *    construction time (`userId ?? sessionIdFromHeader ?? requestId`).
   *    When no user was bound, the fallback is `'system'`.
   */
  abstract captureException(
    error: Error,
    distinctId: string,
    properties?: Record<string, unknown>,
  ): void
  abstract captureException(error: Error, context?: Record<string, unknown>): void
  abstract captureException(
    error: Error,
    distinctIdOrContext?: string | Record<string, unknown>,
    properties?: Record<string, unknown>,
  ): void

  /**
   * Capture a revenue event scoped to this request — useful for
   * attributing revenue to the originating endpoint / session.
   */
  abstract captureRevenue(event: RevenueEvent): void

  /**
   * Capture an LLM generation event scoped to this request — adds
   * `request_id` so an LLM call can be traced back to the originating
   * endpoint without consulting application logs.
   */
  abstract captureLlm(event: LlmEvent): void

  /**
   * Identify the current request's user. Stamps the per-request
   * super-properties so traits land on the same profile as the events.
   */
  abstract identify(distinctId: string, traits?: Record<string, unknown>): void

  /**
   * Alias the request's anonymous id to its identified id when login
   * happens mid-request.
   */
  abstract alias(distinctId: string, alias: string): void

  /**
   * Stitch the request into a group (`organization`, `workspace`).
   * Subsequent events on this request stamp `$group` automatically.
   */
  abstract group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void

  /**
   * The request's `$session_id` (resolved from `X-PostHog-Session` header
   * or generated). SYNCHRONOUS — NOT a Promise.
   */
  abstract sessionId(): string

  /**
   * Server-side feature flag evaluation, scoped to the request's
   * `distinct_id`.
   */
  abstract isFeatureEnabled(key: string, distinctId: string): Promise<boolean>

  /**
   * Bulk flag evaluation, scoped to the request's `distinct_id`. Used by
   * RSC bootstrap to hydrate the client with the full flag set in one
   * round-trip.
   */
  abstract getAllFlags(distinctId: string): Promise<Record<string, boolean | string>>

  /**
   * Forwards to the parent tracker. The request-scoped wrapper itself has
   * nothing to flush — included only to keep the surface symmetric so
   * consumers can hold a `RequestAnalyticsTracker` reference and still
   * shut down on SIGTERM.
   */
  abstract shutdown(): Promise<void>
}
