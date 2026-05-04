import { describe, expect, it } from 'vitest'
import { SubscriptionSchema } from '../../src/entities/schemas/SubscriptionSchema.ts'

const base = {
  id: 'sub_1',
  userId: 'user_1',
  source: 'stripe' as const,
  status: 'active' as const,
  productId: 'prod_1',
  currentPeriodStart: new Date('2026-01-01'),
  currentPeriodEnd: new Date('2026-02-01'),
  cancelAt: null,
}

describe('SubscriptionSchema', () => {
  it('parses a valid subscription', () => {
    expect(SubscriptionSchema.parse(base)).toEqual(base)
  })

  it('rejects an invalid status', () => {
    expect(() => SubscriptionSchema.parse({ ...base, status: 'pending' })).toThrow()
  })

  it('rejects missing userId', () => {
    const { userId: _u, ...rest } = base
    expect(() => SubscriptionSchema.parse(rest)).toThrow()
  })

  it('accepts a scheduled cancellation date', () => {
    const parsed = SubscriptionSchema.parse({
      ...base,
      cancelAt: new Date('2026-03-01'),
    })
    expect(parsed.cancelAt).toEqual(new Date('2026-03-01'))
  })
})
