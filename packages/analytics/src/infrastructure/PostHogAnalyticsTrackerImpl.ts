import {
  AnalyticsTracker,
  type AnalyticsTrackerOptions,
  type Environment,
  type LlmEvent,
  ReservedSuperProps,
  type RevenueEvent,
  type Service,
} from '@t/analytics-types'
import { createGlobalLogger } from '@t/logging'
import { PostHog } from 'posthog-node'

/** PostHog adapter for the AnalyticsTracker port; stamps reserved super-props and strips caller overrides. */
export class PostHogAnalyticsTrackerImpl extends AnalyticsTracker {
  private readonly environment: Environment
  private readonly service: Service
  private readonly enabled: boolean
  private readonly postHogClient: PostHog
  private readonly logger: ReturnType<typeof createGlobalLogger>
  private cachedSessionId: string | undefined

  constructor({ environment, service, apiKey, host, enabled }: AnalyticsTrackerOptions) {
    super()
    if (!environment) throw new TypeError('environment required')
    if (!service) throw new TypeError('service required')
    this.environment = environment
    this.service = service
    this.enabled = enabled !== false
    this.postHogClient = new PostHog(apiKey ?? '', { host })
    this.logger = createGlobalLogger({})
  }

  private stampAndStrip(props?: Record<string, unknown>): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...(props ?? {}) }
    for (const key of ReservedSuperProps) {
      if (key in copy) {
        delete copy[key]
        this.logger.warning(
          {
            message: 'caller attempted to override reserved super-prop',
            metadata: { key },
          },
          '',
        )
      }
    }
    copy.$environment = this.environment
    copy.$service = this.service
    return copy
  }

  capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(properties)
    this.postHogClient.capture({ distinctId, event, properties: stamped, groups })
  }

  captureException(error: Error, distinctId: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(properties)
    this.postHogClient.capture({
      distinctId,
      event: '$exception',
      properties: {
        ...stamped,
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack: error.stack,
      },
    })
  }

  captureRevenue(event: RevenueEvent): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(event.meta)
    stamped.amount = event.amount
    stamped.currency = event.currency
    this.postHogClient.capture({
      distinctId: event.distinctId,
      event: '$revenue',
      properties: stamped,
      groups: event.groups,
    })
  }

  captureLlm(event: LlmEvent): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(event.meta)
    stamped.$ai_model = event.model
    stamped.$ai_input_tokens = event.inputTokens
    stamped.$ai_output_tokens = event.outputTokens
    stamped.$ai_latency = event.latencyMs
    stamped.$ai_trace_id = event.traceId
    this.postHogClient.capture({
      distinctId: event.traceId,
      event: '$ai_generation',
      properties: stamped,
    })
  }

  captureScreen(screenName: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(properties)
    this.postHogClient.capture({
      distinctId: '',
      event: '$screen',
      properties: { ...stamped, $screen_name: screenName },
    })
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(traits)
    this.postHogClient.identify({ distinctId, properties: stamped })
  }

  alias(distinctId: string, alias: string): void {
    if (!this.enabled) return
    this.postHogClient.alias({ distinctId, alias })
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return
    const stamped = this.stampAndStrip(traits)
    // posthog-node requires distinctId on groupIdentify; groupKey is the closest stable proxy.
    this.postHogClient.groupIdentify({
      groupType,
      groupKey,
      properties: stamped,
      distinctId: groupKey,
    })
  }

  sessionId(): string {
    if (!this.cachedSessionId) {
      this.cachedSessionId = crypto.randomUUID()
    }
    return this.cachedSessionId
  }

  async isFeatureEnabled(key: string, distinctId: string): Promise<boolean> {
    const v = await this.postHogClient.isFeatureEnabled(key, distinctId)
    return v ?? false
  }

  async getAllFlags(distinctId: string): Promise<Record<string, boolean | string>> {
    return await this.postHogClient.getAllFlags(distinctId)
  }

  async shutdown(): Promise<void> {
    await this.postHogClient.shutdown()
  }
}
