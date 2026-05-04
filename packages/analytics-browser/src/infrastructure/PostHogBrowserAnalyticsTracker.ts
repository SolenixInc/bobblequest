import type {
  AnalyticsTracker,
  Environment,
  LlmEvent,
  RevenueEvent,
  ScrubOptions,
  Service,
} from '@t/analytics-types'
import { ReservedSuperProps, scrubPiiFromProperties, scrubPiiFromTraits } from '@t/analytics-types'
import posthog from 'posthog-js'

/**
 * Browser analytics tracker using posthog-js.
 * Implements the AnalyticsTracker port by delegating to posthog-js methods.
 *
 * NOTE: posthog-js browser client manages distinctId internally via session.
 * The distinctId parameter from the port is ignored in favour of posthog's own session.
 *
 * PII scrubbing is applied at the port boundary — every user-controlled payload
 * is passed through scrubPiiFromProperties / scrubPiiFromTraits before it reaches
 * posthog-js. The optional `pii` constructor option lets callers customise scrub
 * behaviour (extraKeys, allowKeys, replaceWith, skipPatterns).
 */
export class PostHogBrowserAnalyticsTracker implements AnalyticsTracker {
  private readonly environment: Environment
  private readonly service: Service
  private readonly enabled: boolean
  private readonly piiOptions: ScrubOptions | undefined
  private cachedSessionId: string | undefined

  /* v8 ignore start */
  constructor({
    environment,
    service,
    apiKey,
    host,
    enabled,
    bootstrap,
    sessionRecording,
    pii,
  }: {
    environment: Environment
    service: Service
    apiKey: string
    host: string | undefined
    enabled: boolean
    /** Optional map of feature flags to bootstrap. */
    bootstrap?: Record<string, boolean | string>
    /** Optional toggle for session recording. Defaults to true if enabled. */
    sessionRecording?: boolean
    /** Optional PII scrub options forwarded to every scrubPii* call. */
    pii?: ScrubOptions
  }) {
    this.environment = environment
    this.service = service
    this.enabled = enabled !== false
    this.piiOptions = pii

    if (this.enabled && typeof window !== 'undefined') {
      posthog.init(apiKey, {
        api_host:
          host ??
          (typeof window !== 'undefined' && window.location?.origin
            ? `${window.location.origin}/ingest`
            : 'https://us.i.posthog.com'),
        ui_host: host?.includes('eu.posthog.com')
          ? 'https://eu.posthog.com'
          : 'https://us.posthog.com',
        defaults: '2026-01-30',
        capture_pageview: false,
        capture_performance: true,
        person_profiles: 'identified_only',
        bootstrap: bootstrap ?? {},
        session_recording: sessionRecording !== false ? {} : undefined,
        // Ensure the session is shared across subdomains (e.g. web.app.com and app.com)
        cross_subdomain_cookie: true,
        persistence: 'localStorage+cookie',
      })
    }
  }
  /* v8 ignore stop */

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
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    posthog.capture(event, {
      ...stamped,
      ...(groups ? { $groups: groups } : {}),
    })
  }

  captureException(error: Error, _distinctId: string, properties?: Record<string, unknown>): void {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    // Flatten error message + stack into properties, then scrub the entire bag.
    // This matches the server PostHogAnalyticsTrackerImpl approach (parity).
    const withError: Record<string, unknown> = {
      ...scrubbed,
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack: error.stack,
    }
    const scrubbedWithError = scrubPiiFromProperties(withError, this.piiOptions)
    const stamped = this.stampAndStrip(scrubbedWithError)
    posthog.captureException(error, stamped)
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = traits ? scrubPiiFromTraits(traits, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    posthog.identify(distinctId, stamped as Record<string, string>)
  }

  alias(distinctId: string, alias: string): void {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    posthog.alias(alias, distinctId)
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = traits ? scrubPiiFromTraits(traits, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    posthog.group(groupType, groupKey, stamped)
  }

  sessionId(): string {
    if (!this.cachedSessionId) {
      this.cachedSessionId = crypto.randomUUID()
    }
    return this.cachedSessionId
  }

  async isFeatureEnabled(key: string, _distinctId: string): Promise<boolean> {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return false
    return posthog.isFeatureEnabled(key) ?? false
  }

  async getAllFlags(_distinctId: string): Promise<Record<string, boolean | string>> {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return {}
    // posthog-js browser: getFlagVariants() returns all evaluated flags
    return posthog.featureFlags.getFlagVariants() ?? {}
  }

  captureRevenue(event: RevenueEvent): void {
    /* v8 ignore next */
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = event.meta ? scrubPiiFromProperties(event.meta, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    stamped.amount = event.amount
    stamped.currency = event.currency
    posthog.capture('$revenue', stamped)
  }

  captureLlm(event: LlmEvent): void {
    if (!this.enabled || typeof window === 'undefined') return
    const scrubbed = event.meta ? scrubPiiFromProperties(event.meta, this.piiOptions) : {}
    const stamped = this.stampAndStrip(scrubbed)
    stamped.$ai_model = event.model
    stamped.$ai_input_tokens = event.inputTokens
    stamped.$ai_output_tokens = event.outputTokens
    stamped.$ai_latency = event.latencyMs
    stamped.$ai_trace_id = event.traceId
    posthog.capture('$ai_generation', stamped)
  }

  capturePageView(url: string): void {
    if (!this.enabled || typeof window === 'undefined') return
    // $current_url is a posthog reserved prop — not a user payload, no scrubbing needed.
    posthog.capture('$pageview', { $current_url: url })
  }

  captureScreen(screenName: string, properties?: Record<string, unknown>): void {
    if (!this.enabled || typeof window === 'undefined') return
    // $screen_name is posthog reserved — no scrubbing needed.
    const scrubbed = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    posthog.capture('$screen', { $screen_name: screenName, ...scrubbed })
  }

  setSuperProperties(properties: Record<string, unknown>): void {
    if (!this.enabled || typeof window === 'undefined') return
    posthog.register(properties)
  }

  clearSuperProperties(): void {
    if (!this.enabled || typeof window === 'undefined') return
    posthog.reset()
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
