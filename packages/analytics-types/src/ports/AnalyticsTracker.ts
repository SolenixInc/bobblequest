import type { LlmEvent } from '../types/LlmEvent.ts'
import type { RevenueEvent } from '../types/RevenueEvent.ts'

/**
 * Canonical analytics port. Implementations adapt this surface to a concrete
 * provider (PostHog, NoOp, in-memory test double). Consumers — apps and other
 * packages — depend ONLY on this port, never on a concrete impl.
 *
 * Exposes EXACTLY 11 methods. Anything broader (e.g. performance metrics) is
 * middleware that composes on top of `capture(...)`.
 */
export abstract class AnalyticsTracker {
  /**
   * Capture a generic event for `distinctId`.
   *
   * Reserved super-properties (`$environment`, `$service`, `$session_id`,
   * `distinct_id`, `request_id`, `$group`) are stamped by the tracker /
   * request-scoped wrapper and stripped from caller-supplied `properties`.
   *
   * Fire-and-forget — buffered + flushed by the implementation.
   */
  abstract capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void

  /**
   * Capture an error as a PostHog `$exception` event for `distinctId`.
   * The implementation extracts message / stack / name from `error`.
   *
   * Side effect: increments `$exception` counters in the analytics backend.
   */
  abstract captureException(
    error: Error,
    distinctId: string,
    properties?: Record<string, unknown>,
  ): void

  /**
   * Capture a revenue event. Mapped by the implementation to PostHog's
   * `$revenue` reserved event with `amount` + `currency`.
   *
   * Used by `@t/billing` on Stripe `invoice.paid` and RevenueCat
   * lifecycle webhooks.
   */
  abstract captureRevenue(event: RevenueEvent): void

  /**
   * Capture an LLM generation event. Mapped by the implementation to
   * PostHog's `$ai_generation` event with model / token / latency fields.
   *
   * Used by `@t/ai` per model call.
   */
  abstract captureLlm(event: LlmEvent): void

  /**
   * Identify a user with `distinctId` and optional `traits`. Subsequent
   * events for the same `distinctId` will be associated with these traits.
   */
  abstract identify(distinctId: string, traits?: Record<string, unknown>): void

  /**
   * Alias `distinctId` to `alias` so events captured under either id are
   * merged into a single user profile (typically anon → identified).
   */
  abstract alias(distinctId: string, alias: string): void

  /**
   * Stitch the current user into a group (`organization`, `workspace`,
   * etc). Subsequent events stamp `$group` so cohort analyses work.
   */
  abstract group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void

  /**
   * Stable per-tracker session identifier. SYNCHRONOUS — cheap to read on
   * every event. NOT a `Promise<string>`. Generated lazily if absent.
   */
  abstract sessionId(): string

  /**
   * Server-side feature flag evaluation for `distinctId`. Awaits the
   * implementation's flag cache / network fetch.
   */
  abstract isFeatureEnabled(key: string, distinctId: string): Promise<boolean>

  /**
   * Bulk feature flag evaluation for `distinctId`. Returns a map of all
   * known flags to their current value (boolean for booleans, string for
   * multi-variant flags). Used for RSC bootstrap.
   */
  abstract getAllFlags(distinctId: string): Promise<Record<string, boolean | string>>

  /**
   * Flush buffered events and release resources. Call on graceful shutdown
   * (SIGTERM) — failing to await this drops in-flight events.
   */
  /**
   * Capture a screen view event (React Native specific).
   */
  abstract captureScreen(screenName: string, properties?: Record<string, unknown>): void

  abstract shutdown(): Promise<void>
}
