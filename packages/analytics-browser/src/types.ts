/**
 * Minimum structural config shape for analytics initialization.
 *
 * Structurally compatible with both `ConfigRepository` from @t/config and
 * `WebClientConfig` from @t/config/browser. The analytics package reads only
 * these fields; the type lives here to avoid coupling to either consumer.
 */
export interface AnalyticsConfig {
  analytics: {
    apiKey: string
    host?: string
    enabled: boolean
    /**
     * Optional map of feature flags to bootstrap.
     * Use this to avoid flickering on first render by fetching flags on the server.
     */
    bootstrap?: Record<string, boolean | string>
    /**
     * Optional toggle for session recording.
     * @default true
     */
    sessionRecording?: boolean
  }
  system: {
    environment: string
  }
}
