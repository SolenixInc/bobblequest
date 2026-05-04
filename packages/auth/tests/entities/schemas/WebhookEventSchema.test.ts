import { describe, expect, test } from 'vitest'
import { WebhookEventSchema } from '../../../src/entities/schemas/WebhookEventSchema.ts'

describe('WebhookEventSchema', () => {
  test('parses a user.created event', () => {
    const evt = WebhookEventSchema.parse({
      type: 'user.created',
      data: {
        id: 'user_1',
        email_addresses: [{ id: 'e1', email_address: 'a@b.com' }],
        primary_email_address_id: 'e1',
      },
    })
    expect(evt.type).toBe('user.created')
  })

  test('parses a user.updated event', () => {
    const evt = WebhookEventSchema.parse({
      type: 'user.updated',
      data: { id: 'user_1', email_addresses: [] },
    })
    expect(evt.type).toBe('user.updated')
  })

  test('parses a user.deleted event', () => {
    const evt = WebhookEventSchema.parse({
      type: 'user.deleted',
      data: { id: 'user_1', deleted: true },
    })
    expect(evt.type).toBe('user.deleted')
  })

  test('rejects unknown event types', () => {
    expect(() =>
      WebhookEventSchema.parse({
        type: 'session.created',
        data: { id: 's' },
      }),
    ).toThrow()
  })

  test('rejects missing user id', () => {
    expect(() =>
      WebhookEventSchema.parse({
        type: 'user.created',
        data: { id: '', email_addresses: [] },
      }),
    ).toThrow()
  })
})
