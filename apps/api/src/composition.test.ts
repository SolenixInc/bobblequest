/**
 * Composition root smoke test.
 *
 * Verifies that `buildContainer()` boots cleanly under `NODE_ENV=testing`
 * (env stubs in __tests__/setup.ts) and that all expected DI tokens resolve
 * without throwing.
 *
 * Token coverage notes:
 * - `DB`: intentionally NOT registered when `environment === 'testing'`;
 *   `registerDbDI` skips the DB binding and registers in-memory repositories
 *   instead. This is by design — asserted below.
 * - `BILLING_REPOSITORY`: registered via try/catch; resolves when all billing
 *   env vars are set (they are in setup.ts).
 *
 * Cache-specific notes:
 * - Under `environment === 'testing'`, `registerCacheDI` binds `InMemoryCacheImpl`.
 * - Under `environment === 'production'`, `registerCacheDI` binds `RedisCacheImpl`.
 *   ioredis is mocked at the top of this file so no real socket is opened.
 */

import type { AuthProvider } from '@t/auth'
import { CACHE_DEPENDENCY_KEY, InMemoryCacheImpl, RedisCacheImpl, registerCacheDI } from '@t/cache'
import type { CacheClient } from '@t/cache'
import type { UserRepository } from '@t/db'
import { createContainer, dependencyKeys } from '@t/dependency-injection'
import type { Container } from '@t/dependency-injection'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildContainer } from './composition'

// Stub ioredis so RedisCacheImpl construction doesn't open a real socket.
// vi.mock is hoisted by Vitest above all imports regardless of source order.
vi.mock('ioredis', () => {
  class FakeRedis {
    // biome-ignore lint/complexity/noUselessConstructor: accepts ioredis constructor args
    constructor(_: unknown, __?: unknown) {}
    duplicate() {
      return new FakeRedis({})
    }
    on() {
      return this
    }
    async quit() {
      return 'OK'
    }
    disconnect() {
      /* noop */
    }
  }
  return { default: FakeRedis }
})

describe('buildContainer', () => {
  let container: Container

  beforeAll(() => {
    container = buildContainer()
  })

  it('returns a container without throwing', () => {
    expect(container).toBeDefined()
  })

  it('resolves CONFIG', () => {
    expect(() => container.resolve(dependencyKeys.global.CONFIG)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.CONFIG)).toBeDefined()
  })

  it('resolves LOGGER_FACTORY', () => {
    expect(() => container.resolve(dependencyKeys.global.LOGGER_FACTORY)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.LOGGER_FACTORY)).toBeDefined()
  })

  it('resolves LOGGER', () => {
    expect(() => container.resolve(dependencyKeys.global.LOGGER)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.LOGGER)).toBeDefined()
  })

  it('resolves CACHE (InMemory in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.CACHE)).not.toThrow()
    const cache = container.resolve<CacheClient>(dependencyKeys.global.CACHE)
    expect(cache).toBeDefined()
    expect(cache).toBeInstanceOf(InMemoryCacheImpl)
  })

  it('resolves USER_REPOSITORY (InMemory in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.USER_REPOSITORY)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.USER_REPOSITORY)).toBeDefined()
  })

  it('resolves EMBEDDING_STORE (InMemory in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.EMBEDDING_STORE)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.EMBEDDING_STORE)).toBeDefined()
  })

  it('resolves AUTH (NoopAuthProvider in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.AUTH)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.AUTH)).toBeDefined()
  })

  it('resolves ANALYTICS (NoOp in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.ANALYTICS)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.ANALYTICS)).toBeDefined()
  })

  it('resolves QUEUE (InMemoryQueueImpl in testing)', () => {
    expect(() => container.resolve(dependencyKeys.global.QUEUE)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.QUEUE)).toBeDefined()
  })

  it('does NOT register DB in testing (registerDbDI design: in-memory repos only)', () => {
    // registerDbDI intentionally skips the DB binding under environment=testing.
    // Procedures must use USER_REPOSITORY / EMBEDDING_STORE instead.
    expect(() => container.resolve(dependencyKeys.global.DB)).toThrow()
  })

  it('resolves BILLING_REPOSITORY when billing env vars are present', () => {
    // Billing env vars are set in setup.ts so the try/catch in buildContainer
    // should succeed and the token should resolve.
    expect(() => container.resolve(dependencyKeys.global.BILLING_REPOSITORY)).not.toThrow()
    expect(container.resolve(dependencyKeys.global.BILLING_REPOSITORY)).toBeDefined()
  })
})

describe('buildContainer — billing catch block', () => {
  it('billing try/catch is covered by v8 ignore; BILLING_REPOSITORY resolves with billing env vars set', () => {
    // The billing catch block (composition.ts lines 52-61) is defensive and guarded
    // by /* v8 ignore */ because ConfigValuesSchema validates billing vars at startup
    // before the catch block is reachable. This test verifies the happy-path resolve.
    const c = buildContainer()
    expect(() => c.resolve(dependencyKeys.global.BILLING_REPOSITORY)).not.toThrow()
  })
})

/**
 * Cache DI — registrar assertions.
 *
 * These tests exercise `registerCacheDI` directly against a fresh container so
 * we don't spin up the full composition root (which would require all registrars
 * to succeed in a non-testing environment).
 *
 * ioredis is mocked at the module level — FakeRedis is instantiated instead of
 * opening a real socket.
 */
describe('registerCacheDI — CACHE_DEPENDENCY_KEY resolution', () => {
  let c: Container

  afterEach(async () => {
    await c.dispose()
  })

  it('resolves to InMemoryCacheImpl in testing environment', () => {
    c = createContainer()
    registerCacheDI(c, {
      config: { redis: { host: 'localhost', port: 6379, tls: false, db: 0 } } as never,
      environment: 'testing',
    })
    const cache = c.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(cache).toBeInstanceOf(InMemoryCacheImpl)
  })

  it('resolves to RedisCacheImpl in production environment (ioredis mocked)', () => {
    c = createContainer()
    registerCacheDI(c, {
      config: {
        redis: { url: 'redis://localhost:6379', host: 'localhost', port: 6379, tls: false, db: 0 },
      } as never,
      environment: 'production',
    })
    const cache = c.resolve<CacheClient>(CACHE_DEPENDENCY_KEY)
    expect(cache).toBeInstanceOf(RedisCacheImpl)
  })
})

/**
 * userSync closure coverage (composition.ts lines 48-88).
 *
 * In testing mode, registerAuthDI wires NoopAuthProvider with the userSync
 * closure. NoopAuthProvider.syncFromWebhook calls userSync directly.
 * USER_REPOSITORY is the InMemoryUserRepository registered by registerDbDI.
 *
 * Each branch of the userSync closure is exercised by calling
 * auth.syncFromWebhook with the appropriate event type and validating the
 * side effects on the in-memory repository.
 */
describe('buildContainer — userSync closure', () => {
  let auth: AuthProvider
  let repo: UserRepository

  beforeAll(() => {
    const c = buildContainer()
    auth = c.resolve<AuthProvider>(dependencyKeys.global.AUTH)
    repo = c.resolve<UserRepository>(dependencyKeys.global.USER_REPOSITORY)
  })

  it('user.created — calls repo.create with the projected shape', async () => {
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_create_1',
        first_name: 'Alice',
        last_name: 'Smith',
        image_url: 'https://example.com/avatar.png',
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'alice@example.com' }],
      },
    })

    const created = await repo.findByClerkUserId('clerk_create_1')
    expect(created).not.toBeNull()
    expect(created?.clerkUserId).toBe('clerk_create_1')
    expect(created?.email).toBe('alice@example.com')
    expect(created?.displayName).toBe('Alice Smith')
    expect(created?.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('user.created — email is empty string when primary_email_address_id has no match (closure ?? behavior)', async () => {
    // The userSync closure uses: primaryId ? find(...) : first → ?? ''
    // When primaryId is set but not found, the find returns undefined and ?? '' kicks in.
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_create_2',
        first_name: null,
        last_name: null,
        image_url: null,
        primary_email_address_id: 'email_nonexistent',
        email_addresses: [{ id: 'email_1', email_address: 'fallback@example.com' }],
      },
    })

    const created = await repo.findByClerkUserId('clerk_create_2')
    expect(created?.email).toBe('')
    expect(created?.displayName).toBeNull()
  })

  it('user.updated — calls repo.update with the projected shape when user exists', async () => {
    // Seed a user to update
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_update_1',
        first_name: 'Bob',
        last_name: 'Jones',
        image_url: null,
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'bob@example.com' }],
      },
    })

    await auth.syncFromWebhook({
      type: 'user.updated',
      data: {
        id: 'clerk_update_1',
        first_name: 'Bobby',
        last_name: 'Jones',
        image_url: 'https://example.com/new-avatar.png',
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'bobby@example.com' }],
      },
    })

    const updated = await repo.findByClerkUserId('clerk_update_1')
    expect(updated?.email).toBe('bobby@example.com')
    expect(updated?.displayName).toBe('Bobby Jones')
    expect(updated?.avatarUrl).toBe('https://example.com/new-avatar.png')
  })

  it('user.updated — null primaryId falls back to first email; null names yield null displayName', async () => {
    // Seed a user
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_update_2',
        first_name: 'Dave',
        last_name: null,
        image_url: null,
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'dave@example.com' }],
      },
    })

    // Update: primaryId null → fallback to first; no names → displayName null
    await auth.syncFromWebhook({
      type: 'user.updated',
      data: {
        id: 'clerk_update_2',
        first_name: null,
        last_name: null,
        image_url: null,
        primary_email_address_id: null,
        email_addresses: [{ id: 'email_1', email_address: 'dave-updated@example.com' }],
      },
    })

    const updated = await repo.findByClerkUserId('clerk_update_2')
    expect(updated?.email).toBe('dave-updated@example.com')
    expect(updated?.displayName).toBeNull()
  })

  it('user.updated — undefined email when primaryId null and no email addresses', async () => {
    // Seed a user
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_update_3',
        first_name: 'Eve',
        last_name: null,
        image_url: null,
        primary_email_address_id: 'email_1',
        email_addresses: [{ id: 'email_1', email_address: 'eve@example.com' }],
      },
    })

    // Update: primaryId null, email_addresses empty → email_addresses[0] is undefined
    // → optional chain gives undefined → ?? undefined → email stays as-is (InMemoryRepo keeps old value)
    await auth.syncFromWebhook({
      type: 'user.updated',
      data: {
        id: 'clerk_update_3',
        first_name: null,
        last_name: null,
        image_url: null,
        primary_email_address_id: null,
        email_addresses: [],
      },
    })

    const updated = await repo.findByClerkUserId('clerk_update_3')
    // email_addresses is empty, primaryId null → email arg is undefined → repo.update keeps original
    expect(updated?.email).toBe('eve@example.com')
  })

  it('user.updated — no-op when user does not exist in repo (returns without throwing)', async () => {
    // This clerk id has never been created — findByClerkUserId returns null
    await expect(
      auth.syncFromWebhook({
        type: 'user.updated',
        data: {
          id: 'clerk_ghost_update',
          first_name: 'Ghost',
          last_name: null,
          image_url: null,
          primary_email_address_id: null,
          email_addresses: [],
        },
      }),
    ).resolves.toBeUndefined()

    // Repo should have no record for this clerk id
    const notFound = await repo.findByClerkUserId('clerk_ghost_update')
    expect(notFound).toBeNull()
  })

  it('user.deleted — calls repo.delete when user exists', async () => {
    // Seed a user to delete
    await auth.syncFromWebhook({
      type: 'user.created',
      data: {
        id: 'clerk_delete_1',
        first_name: 'Carol',
        last_name: null,
        image_url: null,
        primary_email_address_id: null,
        email_addresses: [{ id: 'email_1', email_address: 'carol@example.com' }],
      },
    })

    const before = await repo.findByClerkUserId('clerk_delete_1')
    expect(before).not.toBeNull()

    await auth.syncFromWebhook({
      type: 'user.deleted',
      data: { id: 'clerk_delete_1', deleted: true },
    })

    const after = await repo.findByClerkUserId('clerk_delete_1')
    expect(after).toBeNull()
  })

  it('user.deleted — no-op when user does not exist in repo (returns without throwing)', async () => {
    await expect(
      auth.syncFromWebhook({
        type: 'user.deleted',
        data: { id: 'clerk_ghost_delete', deleted: true },
      }),
    ).resolves.toBeUndefined()
  })
})
