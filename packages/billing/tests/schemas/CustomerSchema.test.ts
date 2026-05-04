import { describe, expect, it } from 'vitest'
import { CustomerSchema } from '../../src/entities/schemas/CustomerSchema.ts'

describe('CustomerSchema', () => {
  it('parses a valid customer with all fields', () => {
    const result = CustomerSchema.parse({
      userId: 'user_123',
      stripeCustomerId: 'cus_abc',
      revenuecatAppUserId: 'rc_user_xyz',
      email: 'user@example.com',
    })
    expect(result.userId).toBe('user_123')
    expect(result.stripeCustomerId).toBe('cus_abc')
    expect(result.revenuecatAppUserId).toBe('rc_user_xyz')
    expect(result.email).toBe('user@example.com')
  })

  it('parses a customer with nullable fields set to null', () => {
    const result = CustomerSchema.parse({
      userId: 'user_456',
      stripeCustomerId: null,
      revenuecatAppUserId: null,
      email: null,
    })
    expect(result.stripeCustomerId).toBeNull()
    expect(result.revenuecatAppUserId).toBeNull()
    expect(result.email).toBeNull()
  })

  it('rejects empty userId', () => {
    const result = CustomerSchema.safeParse({
      userId: '',
      stripeCustomerId: null,
      revenuecatAppUserId: null,
      email: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CustomerSchema.safeParse({
      userId: 'user_1',
      stripeCustomerId: null,
      revenuecatAppUserId: null,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty stripeCustomerId (min 1)', () => {
    const result = CustomerSchema.safeParse({
      userId: 'user_1',
      stripeCustomerId: '',
      revenuecatAppUserId: null,
      email: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty revenuecatAppUserId (min 1)', () => {
    const result = CustomerSchema.safeParse({
      userId: 'user_1',
      stripeCustomerId: null,
      revenuecatAppUserId: '',
      email: null,
    })
    expect(result.success).toBe(false)
  })
})
