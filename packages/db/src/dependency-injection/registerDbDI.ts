import type { ConfigRepository } from '@t/config'
import { type Container, asClass, asFunction, dependencyKeys } from '@t/dependency-injection'
import type { DbClient } from '../entities/ports/DbClient.ts'
import type { EmbeddingStore } from '../entities/ports/EmbeddingStore.ts'
import type { ProjectRepository } from '../entities/ports/ProjectRepository.ts'
import type { UserRepository } from '../entities/ports/UserRepository.ts'
import {
  DrizzleDbClientImpl,
  DrizzleEmbeddingStoreImpl,
  DrizzleProjectRepositoryImpl,
  DrizzleUserRepositoryImpl,
} from '../infrastructure/drizzle/index.ts'
import {
  InMemoryEmbeddingStore,
  InMemoryProjectRepository,
  InMemoryUserRepository,
} from '../infrastructure/in-memory/index.ts'

/**
 * DI keys for the `@t/db` bindings.
 *
 * Re-exported aliases of `dependencyKeys.global.{DB,USER_REPOSITORY,PROJECT_REPOSITORY,EMBEDDING_STORE}`
 * owned by `@t/dependency-injection`. Preferred consumer form is to
 * import the canonical tokens directly; these aliases are preserved for
 * existing call sites and tests.
 */
export const DB_DEPENDENCY_KEY = dependencyKeys.global.DB
export const USER_REPOSITORY_DEPENDENCY_KEY = dependencyKeys.global.USER_REPOSITORY
export const PROJECT_REPOSITORY_DEPENDENCY_KEY = dependencyKeys.global.PROJECT_REPOSITORY
export const EMBEDDING_STORE_DEPENDENCY_KEY = dependencyKeys.global.EMBEDDING_STORE

/**
 * Options bag for {@link registerDbDI}.
 *
 * The options-bag form matches `registerAnalyticsDI` / `registerCacheDI`:
 * it keeps the registrar explicit at the composition root and prevents
 * hidden `process.env` reads from leaking into `@t/db` itself.
 */
export interface RegisterDbDIOptions {
  /** Typed config repository sourced from `@t/config`. */
  readonly config: ConfigRepository
  /** Resolved runtime environment (typically from `RAILWAY_ENVIRONMENT`). */
  readonly environment: 'development' | 'local' | 'testing' | 'production'
}

/**
 * Registers the `@t/db` bindings in the DI container.
 *
 * Selection order (first match wins):
 *   1. `environment === 'testing'` -> in-memory repositories; no
 *      `DbClient` is bound so tests that touch raw SQL fail fast.
 *   2. otherwise -> `DrizzleDbClientImpl` + Drizzle-backed repositories,
 *      constructed against `config.db.url` (typically Railway's
 *      `DATABASE_URL`).
 *
 * All bindings are singletons -- the pool is long-lived and the
 * repositories are stateless wrappers around it.
 */
export function registerDbDI(container: Container, opts: RegisterDbDIOptions): void {
  const { config, environment } = opts

  if (environment === 'testing') {
    container.register({
      [USER_REPOSITORY_DEPENDENCY_KEY]: asClass(InMemoryUserRepository).singleton(),
      [PROJECT_REPOSITORY_DEPENDENCY_KEY]: asClass(InMemoryProjectRepository).singleton(),
      [EMBEDDING_STORE_DEPENDENCY_KEY]: asClass(InMemoryEmbeddingStore).singleton(),
    })
    return
  }

  if (!config.db?.url) {
    throw new Error(
      `registerDbDI: config.db.url (DATABASE_URL) is required when environment is '${environment}'`,
    )
  }

  const dbUrl = config.db.url
  const dbOptions = {
    url: dbUrl,
    max: config.db.maxConnections,
    prepare: config.db.prepare,
  }

  // Factory-registered so the subclasses of the port share one pool.
  const clientFactory = (): DbClient => new DrizzleDbClientImpl(dbOptions)

  container.register({
    [DB_DEPENDENCY_KEY]: asFunction(clientFactory).singleton(),
    [USER_REPOSITORY_DEPENDENCY_KEY]: asFunction(
      ({ [DB_DEPENDENCY_KEY]: db }: { [k: string]: DbClient }): UserRepository =>
        new DrizzleUserRepositoryImpl(db as DrizzleDbClientImpl),
    ).singleton(),
    [PROJECT_REPOSITORY_DEPENDENCY_KEY]: asFunction(
      ({ [DB_DEPENDENCY_KEY]: db }: { [k: string]: DbClient }): ProjectRepository =>
        new DrizzleProjectRepositoryImpl(db as DrizzleDbClientImpl),
    ).singleton(),
    [EMBEDDING_STORE_DEPENDENCY_KEY]: asFunction(
      ({ [DB_DEPENDENCY_KEY]: db }: { [k: string]: DbClient }): EmbeddingStore =>
        new DrizzleEmbeddingStoreImpl(db as DrizzleDbClientImpl),
    ).singleton(),
  })
}
