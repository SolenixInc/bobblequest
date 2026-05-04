/**
 * Minimum structural config shape for analytics initialization.
 *
 * Structurally compatible with both `ConfigRepository` from @t/config.
 * The analytics package reads only these fields; the type lives here to avoid
 * coupling to the consumer.
 */
export interface AnalyticsConfig {
  analytics: {
    apiKey: string
    host?: string
    enabled: boolean
    /**
     * Optional map of feature flags to bootstrap.
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
