import {
  type AnalyticsTracker,
  type LlmEvent,
  RequestAnalyticsTracker,
  type RevenueEvent,
} from '@t/analytics-types'

/** Request-scoped wrapper that stamps per-request super-properties onto every outbound analytics call before delegating to the parent `AnalyticsTracker`. */
export class RequestAnalyticsTrackerImpl extends RequestAnalyticsTracker {
  private readonly parent: AnalyticsTracker
  private readonly requestId: string
  private readonly groupKey?: string
  private readonly distinctIdValue: string
  private readonly sessionIdValue: string

  constructor({
    parent,
    requestId,
    userId,
    distinctIdFromHeader,
    sessionIdFromHeader,
    groupKey,
  }: {
    parent: AnalyticsTracker
    requestId: string
    userId?: string
    distinctIdFromHeader?: string
    sessionIdFromHeader?: string
    groupKey?: string
  }) {
    super()
    this.parent = parent
    this.requestId = requestId
    this.groupKey = groupKey
    this.distinctIdValue = userId ?? distinctIdFromHeader ?? sessionIdFromHeader ?? requestId
    this.sessionIdValue = sessionIdFromHeader ?? requestId
  }

  private stamp(props?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...(props ?? {}),
      distinct_id: this.distinctIdValue,
      $session_id: this.sessionIdValue,
      request_id: this.requestId,
      ...(this.groupKey ? { $group: this.groupKey } : {}),
    }
  }

  capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void {
    this.parent.capture(event, distinctId, this.stamp(properties), groups)
  }

  captureException(error: Error, distinctId: string, properties?: Record<string, unknown>): void
  captureException(error: Error, context?: Record<string, unknown>): void
  captureException(
    error: Error,
    distinctIdOrContext?: string | Record<string, unknown>,
    properties?: Record<string, unknown>,
  ): void {
    if (typeof distinctIdOrContext === 'string') {
      // Original 3-arg shape: explicit distinctId
      this.parent.captureException(error, distinctIdOrContext, this.stamp(properties))
    } else {
      // Request-scoped 2-arg shape: auto-fill distinctId from bound user.
      // distinctIdValue is always a non-empty string (userId ?? sessionIdFromHeader ?? requestId),
      // so no additional fallback is needed here.
      this.parent.captureException(error, this.distinctIdValue, this.stamp(distinctIdOrContext))
    }
  }

  captureRevenue(event: RevenueEvent): void {
    const stampedMeta = this.stamp(event.meta)
    this.parent.captureRevenue({ ...event, meta: stampedMeta })
  }

  captureLlm(event: LlmEvent): void {
    this.parent.captureLlm({ ...event, meta: this.stamp(event.meta) })
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    this.parent.identify(distinctId, this.stamp(traits))
  }

  alias(distinctId: string, alias: string): void {
    this.parent.alias(distinctId, alias)
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    this.parent.group(groupType, groupKey, this.stamp(traits))
  }

  sessionId(): string {
    return this.sessionIdValue
  }

  isFeatureEnabled(key: string, distinctId: string): Promise<boolean> {
    return this.parent.isFeatureEnabled(key, distinctId)
  }

  getAllFlags(distinctId: string): Promise<Record<string, boolean | string>> {
    return this.parent.getAllFlags(distinctId)
  }

  shutdown(): Promise<void> {
    return this.parent.shutdown()
  }
}
