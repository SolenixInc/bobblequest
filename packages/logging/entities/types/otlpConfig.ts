/**
 * @fileoverview OTLP transport configuration type.
 *
 * Describes the full options surface consumed by the PostHog OTLP winston
 * transport. The transport-factory singleton fills these from env vars with
 * sensible defaults.
 */

export interface OTLPConfig {
  /** Full OTLP logs endpoint URL (e.g. `https://us.i.posthog.com/v1/logs`). */
  endpoint: string
  /** PostHog project API key used as the bearer token. */
  apiKey: string
  /** Max buffered records before forced drop. */
  maxQueueSize: number
  /** Max records per export call. */
  batchSize: number
  /** Delay between scheduled batch exports, in milliseconds. */
  exportIntervalMillis: number
  /** Per-export timeout, in milliseconds. */
  exportTimeoutMillis: number
}
