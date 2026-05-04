import { type Container, createContainer } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stub postgres-js and drizzle-orm postgres adapter so constructing
// DrizzleDbClientImpl does NOT open a real TCP socket or access internal
// postgres client properties.
vi.mock('postgres', () => {
  const fake = Object.assign(() => {
    const parsers: Record<number, unknown> = {}
    const client: Record<string, unknown> = {
      unsafe: async () => [],
      end: async () => {},
      options: { parsers },
    }
    return client
  }, {})
  return { default: fake }
})

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (_client: unknown, _opts: unknown) => ({
    query: {},
    select: () => ({ from: () => ({ where: () => [] }) }),
  }),
}))

import {
  DB_DEPENDENCY_KEY,
  EMBEDDING_STORE_DEPENDENCY_KEY,
  PROJECT_REPOSITORY_DEPENDENCY_KEY,
  USER_REPOSITORY_DEPENDENCY_KEY,
  registerDbDI,
} from '../../src/dependency-injection/registerDbDI.ts'
import type { DbClient } from '../../src/entities/ports/DbClient.ts'
import type { EmbeddingStore } from '../../src/entities/ports/EmbeddingStore.ts'
import type { ProjectRepository } from '../../src/entities/ports/ProjectRepository.ts'
import type { UserRepository } from '../../src/entities/ports/UserRepository.ts'
import {
  DrizzleDbClientImpl,
  DrizzleEmbeddingStoreImpl,
  DrizzleProjectRepositoryImpl,
  DrizzleUserRepositoryImpl,
} from '../../src/infrastructure/drizzle/index.ts'
import {
  InMemoryEmbeddingStore,
  InMemoryProjectRepository,
  InMemoryUserRepository,
} from '../../src/infrastructure/in-memory/index.ts'

type DbSlice = { url?: string; maxConnections?: number; prepare?: boolean }
function fakeConfig(db?: DbSlice): { db?: DbSlice } {
  return { db }
}

describe('registerDbDI — environment=testing', () => {
  let container: Container
  beforeEach(() => {
    container = createContainer()
  })
  afterEach(async () => {
    await container.dispose()
  })

  it('registers in-memory repositories', () => {
    registerDbDI(container, {
      config: fakeConfig() as never,
      environment: 'testing',
    })
    expect(container.resolve<UserRepository>(USER_REPOSITORY_DEPENDENCY_KEY)).toBeInstanceOf(
      InMemoryUserRepository,
    )
    expect(container.resolve<ProjectRepository>(PROJECT_REPOSITORY_DEPENDENCY_KEY)).toBeInstanceOf(
      InMemoryProjectRepository,
    )
    expect(container.resolve<EmbeddingStore>(EMBEDDING_STORE_DEPENDENCY_KEY)).toBeInstanceOf(
      InMemoryEmbeddingStore,
    )
  })

  it('does NOT register a DbClient in testing (no raw SQL escape hatch)', () => {
    registerDbDI(container, {
      config: fakeConfig() as never,
      environment: 'testing',
    })
    expect(Object.keys(container.registrations)).not.toContain(DB_DEPENDENCY_KEY)
  })

  it('in-memory repos are singletons', () => {
    registerDbDI(container, {
      config: fakeConfig() as never,
      environment: 'testing',
    })
    const a = container.resolve<UserRepository>(USER_REPOSITORY_DEPENDENCY_KEY)
    const b = container.resolve<UserRepository>(USER_REPOSITORY_DEPENDENCY_KEY)
    expect(a).toBe(b)
  })
})

describe('registerDbDI — production/non-testing envs', () => {
  let container: Container
  beforeEach(() => {
    container = createContainer()
  })
  afterEach(async () => {
    await container.dispose()
  })

  it('registers Drizzle impls when config.db.url is provided', () => {
    registerDbDI(container, {
      config: fakeConfig({
        url: 'postgres://user:pass@localhost:5432/db',
      }) as never,
      environment: 'production',
    })
    expect(container.resolve<DbClient>(DB_DEPENDENCY_KEY)).toBeInstanceOf(DrizzleDbClientImpl)
    expect(container.resolve<UserRepository>(USER_REPOSITORY_DEPENDENCY_KEY)).toBeInstanceOf(
      DrizzleUserRepositoryImpl,
    )
    expect(container.resolve<ProjectRepository>(PROJECT_REPOSITORY_DEPENDENCY_KEY)).toBeInstanceOf(
      DrizzleProjectRepositoryImpl,
    )
    expect(container.resolve<EmbeddingStore>(EMBEDDING_STORE_DEPENDENCY_KEY)).toBeInstanceOf(
      DrizzleEmbeddingStoreImpl,
    )
  })

  it('throws synchronously when DATABASE_URL missing in production env', () => {
    expect(() =>
      registerDbDI(container, {
        config: fakeConfig() as never,
        environment: 'production',
      }),
    ).toThrow(/DATABASE_URL/i)
  })

  it('registerDbDI throws synchronously when DATABASE_URL missing in local env', () => {
    expect(() =>
      registerDbDI(container, {
        config: fakeConfig() as never,
        environment: 'local',
      }),
    ).toThrow(/DATABASE_URL/i)
  })

  it('DB binding is a singleton across resolves', () => {
    registerDbDI(container, {
      config: fakeConfig({
        url: 'postgres://user:pass@localhost:5432/db',
      }) as never,
      environment: 'production',
    })
    const a = container.resolve<DbClient>(DB_DEPENDENCY_KEY)
    const b = container.resolve<DbClient>(DB_DEPENDENCY_KEY)
    expect(a).toBe(b)
  })
})
