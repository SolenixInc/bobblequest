import { describe, expect, test, vi } from 'vitest'
import type { WebhookEvent } from '../../src/entities/schemas/WebhookEventSchema.ts'
import { NoopAuthProvider } from '../../src/infrastructure/noop/NoopAuthProvider.ts'

describe('NoopAuthProvider behavior', () => {
  test('verify returns the default stub user for any non-empty token', async () => {
    const provider = new NoopAuthProvider()
    const user = await provider.verify('any')
    expect(user.id).toBe('user_noop')
    expect(user.email).toBe('noop@example.com')
  })

  test('verify rejects when token is empty', async () => {
    const provider = new NoopAuthProvider()
    await expect(provider.verify('')).rejects.toThrow(/non-empty/)
  })

  test('currentUser returns null for null / undefined / empty', async () => {
    const provider = new NoopAuthProvider()
    expect(await provider.currentUser(null)).toBeNull()
    expect(await provider.currentUser(undefined)).toBeNull()
    expect(await provider.currentUser('')).toBeNull()
  })

  test('currentUser returns stub user for any non-empty token', async () => {
    const provider = new NoopAuthProvider()
    const user = await provider.currentUser('t')
    expect(user?.id).toBe('user_noop')
  })

  test('stubUser override is respected', async () => {
    const provider = new NoopAuthProvider({
      stubUser: {
        id: 'user_custom',
        email: 'custom@example.com',
        firstName: null,
        lastName: null,
        imageUrl: null,
        role: 'admin',
      },
    })
    const user = await provider.verify('t')
    expect(user.id).toBe('user_custom')
    expect(user.role).toBe('admin')
  })

  test('syncFromWebhook invokes userSync when configured', async () => {
    const userSync = vi.fn(async () => {})
    const provider = new NoopAuthProvider({ userSync })
    const event: WebhookEvent = {
      type: 'user.updated',
      data: { id: 'user_1', email_addresses: [] },
    } as WebhookEvent
    await provider.syncFromWebhook(event)
    expect(userSync).toHaveBeenCalledWith(event)
  })

  test('syncFromWebhook is a no-op without userSync', async () => {
    const provider = new NoopAuthProvider()
    await expect(
      provider.syncFromWebhook({
        type: 'user.deleted',
        data: { id: 'x' },
      } as WebhookEvent),
    ).resolves.toBeUndefined()
  })
})
