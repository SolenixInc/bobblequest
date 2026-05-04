import type {
  AnalyticsTracker,
  Environment,
  LlmEvent,
  RevenueEvent,
  ScrubOptions,
  Service,
} from '@t/analytics-types'
import { ReservedSuperProps, scrubPiiFromProperties, scrubPiiFromTraits } from '@t/analytics-types'
import { PostHog } from 'posthog-react-native'

// PostHog constructor returns an instance; we store its shape for typing.
type PostHogInstance = InstanceType<typeof PostHog>

/**
 * React Native analytics tracker using posthog-react-native.
 * Implements the AnalyticsTracker port by delegating to PostHog RN methods.
 *
 * PII scrubbing is applied at the port boundary — every user-controlled payload
 * is passed through scrubPiiFromProperties / scrubPiiFromTraits before it reaches
 * posthog-react-native. The optional `pii` constructor option lets callers customise scrub
 * behaviour (extraKeys, allowKeys, replaceWith, skipPatterns).
 */
export class PostHogRnAnalyticsTracker implements AnalyticsTracker {
  private readonly environment: Environment
  private readonly service: Service
  private readonly enabled: boolean
  private readonly piiOptions: ScrubOptions | undefined
  private readonly posthog: PostHogInstance

  constructor({
    environment,
    service,
    apiKey,
    host,
    enabled,
    pii,
  }: {
    environment: Environment
    service: Service
    apiKey: string
    host: string | undefined
    enabled: boolean
    /** Optional PII scrub options forwarded to every scrubPii* call. */
    pii?: ScrubOptions
  }) {
    this.environment = environment
    this.service = service
    this.enabled = enabled !== false
    this.piiOptions = pii

    this.posthog = new PostHog(apiKey, {
      host: host ?? 'https://us.i.posthog.com',
      captureAppLifecycleEvents: false,
    })
  }

  private stampAndStrip(props: Record<string, unknown> = {}): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...props }
    for (const key of ReservedSuperProps) {
      if (key in copy) {
        delete copy[key]
      }
    }
    copy.$environment = this.environment
    copy.$service = this.service
    return copy
  }

  capture(
    event: string,
    _distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void {
    if (!this.enabled) return
    const scrubbed = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    this.posthog.capture(event, {
      ...stamped,
      ...(groups ? { $groups: groups } : {}),
    } as never)
  }

  captureException(error: Error, _distinctId: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return
    const scrubbed = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    const withError: Record<string, unknown> = {
      ...scrubbed,
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack: error.stack,
    }
    const scrubbedWithError = scrubPiiFromProperties(withError, this.piiOptions)
    const stamped = this.stampAndStrip(scrubbedWithError)
    this.posthog.captureException(error, stamped as never)
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return
    const scrubbed = traits ? scrubPiiFromTraits(traits, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    this.posthog.identify(distinctId, stamped as never)
  }

  alias(_distinctId: string, alias: string): void {
    if (!this.enabled) return
    this.posthog.alias(alias)
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return
    const scrubbed = traits ? scrubPiiFromTraits(traits, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    this.posthog.group(groupType, groupKey, stamped as never)
  }

  sessionId(): string {
    return this.posthog.getSessionId() ?? ''
  }

  async isFeatureEnabled(key: string, _distinctId: string): Promise<boolean> {
    if (!this.enabled) return false
    const result = await this.posthog.isFeatureEnabled(key)
    return result ?? false
  }

  async getAllFlags(_distinctId: string): Promise<Record<string, boolean | string>> {
    if (!this.enabled) return {}
    const result = await this.posthog.getFeatureFlags()
    return result ?? {}
  }

  captureRevenue(event: RevenueEvent): void {
    if (!this.enabled) return
    const scrubbed = event.meta ? scrubPiiFromProperties(event.meta, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    stamped.amount = event.amount
    stamped.currency = event.currency
    this.posthog.capture('$revenue', stamped as never)
  }

  captureLlm(event: LlmEvent): void {
    if (!this.enabled) return
    const scrubbed = event.meta ? scrubPiiFromProperties(event.meta, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    stamped.$ai_model = event.model
    stamped.$ai_input_tokens = event.inputTokens
    stamped.$ai_output_tokens = event.outputTokens
    stamped.$ai_latency = event.latencyMs
    stamped.$ai_trace_id = event.traceId
    this.posthog.capture('$ai_generation', stamped as never)
  }

  captureScreen(screenName: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return
    if (!properties) {
      this.posthog.screen(screenName, undefined)
      return
    }
    const scrubbed = scrubPiiFromProperties(properties, this.piiOptions)
    const stamped = this.stampAndStrip(scrubbed)
    this.posthog.screen(screenName, stamped as never)
  }

  async shutdown(): Promise<void> {
    await this.posthog.shutdown()
  }
}
