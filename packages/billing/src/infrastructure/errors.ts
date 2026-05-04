import type { BillingSource } from '../entities/types/BillingSource.ts'

/**
 * Thrown by the webhook verifiers when an inbound request's signature or
 * shared-secret header fails to validate. HTTP handlers translate this to
 * a `401` (caller decides the exact status).
 */
export class BillingWebhookSignatureError extends Error {
  readonly provider: BillingSource
  // `cause` is typed on ES2022 `Error`, but we keep it explicit so it
  // survives structured logging serializers.
  override readonly cause?: unknown

  constructor(provider: BillingSource, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'BillingWebhookSignatureError'
    this.provider = provider
    this.cause = options?.cause
    // Preserve prototype for `instanceof` checks across TS targets.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when an upstream billing provider returns an unexpected / failing
 * response. HTTP handlers typically surface this as a `502`.
 */
export class BillingProviderError extends Error {
  readonly provider: BillingSource
  override readonly cause?: unknown

  constructor(provider: BillingSource, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'BillingProviderError'
    this.provider = provider
    this.cause = options?.cause
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
