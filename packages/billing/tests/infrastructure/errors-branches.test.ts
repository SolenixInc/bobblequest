import { describe, expect, it } from 'vitest'
import {
  BillingProviderError,
  BillingWebhookSignatureError,
} from '../../src/infrastructure/errors.ts'

describe('BillingWebhookSignatureError', () => {
  it('sets name, provider, and message', () => {
    const err = new BillingWebhookSignatureError('stripe', 'sig mismatch')
    expect(err.name).toBe('BillingWebhookSignatureError')
    expect(err.provider).toBe('stripe')
    expect(err.message).toBe('sig mismatch')
    expect(err).toBeInstanceOf(BillingWebhookSignatureError)
    expect(err).toBeInstanceOf(Error)
  })

  it('accepts cause option', () => {
    const cause = new Error('upstream')
    const err = new BillingWebhookSignatureError('revenuecat', 'bad sig', { cause })
    expect(err.cause).toBe(cause)
  })

  it('cause is undefined when options omitted (options?.cause branch)', () => {
    const err = new BillingWebhookSignatureError('stripe', 'no opts')
    expect(err.cause).toBeUndefined()
  })
})

describe('BillingProviderError', () => {
  it('sets name, provider, and message', () => {
    const err = new BillingProviderError('revenuecat', 'upstream failure')
    expect(err.name).toBe('BillingProviderError')
    expect(err.provider).toBe('revenuecat')
    expect(err.message).toBe('upstream failure')
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err).toBeInstanceOf(Error)
  })

  it('accepts cause option', () => {
    const cause = new Error('root cause')
    const err = new BillingProviderError('stripe', 'provider fail', { cause })
    expect(err.cause).toBe(cause)
  })

  it('cause is undefined when options omitted (options?.cause branch)', () => {
    const err = new BillingProviderError('revenuecat', 'no opts')
    expect(err.cause).toBeUndefined()
  })
})
