import { describe, expect, it } from 'vitest'
import { EntitlementSchema } from '../../src/entities/schemas/EntitlementSchema.ts'

const base = {
  userId: 'user_1',
  productId: 'prod_1',
  source: 'revenuecat' as const,
  status: 'active' as const,
  expiresAt: new Date('2026-12-31'),
}

describe('EntitlementSchema', () => {
  it('parses a valid entitlement', () => {
    expect(EntitlementSchema.parse(base)).toEqual(base)
  })

  it('rejects an invalid status', () => {
    expect(() => EntitlementSchema.parse({ ...base, status: 'pending' })).toThrow()
  })

  it('rejects missing userId', () => {
    const { userId: _u, ...rest } = base
    expect(() => EntitlementSchema.parse(rest)).toThrow()
  })

  it('accepts a null expiresAt (perpetual entitlement)', () => {
    const parsed = EntitlementSchema.parse({ ...base, expiresAt: null })
    expect(parsed.expiresAt).toBeNull()
  })
})
