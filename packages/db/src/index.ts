// Ports — abstract classes consumers depend on.
export * from './entities/ports/index.ts'

// Types — plain TS shapes returned by ports.
export * from './entities/types/index.ts'

// Drizzle schemas — exposed so `@t/db/schemas` and drizzle-kit can
// introspect them. App code should NOT import these directly; go
// through repositories.
export * as schemas from './entities/schemas/index.ts'
export {
  users,
  type UserRow,
  type UserInsert,
} from './entities/schemas/users.ts'
export {
  projects,
  projectStatusEnum,
  type ProjectRow,
  type ProjectInsert,
} from './entities/schemas/projects.ts'
export {
  embeddings,
  DEFAULT_EMBEDDING_DIMENSIONS,
  type EmbeddingRow,
  type EmbeddingInsert,
} from './entities/schemas/embeddings.ts'

// Infrastructure — Drizzle + in-memory impls. Named exports so tests
// and the composition root can reach them directly.
export * from './infrastructure/index.ts'

// DI registrar.
export {
  registerDbDI,
  DB_DEPENDENCY_KEY,
  USER_REPOSITORY_DEPENDENCY_KEY,
  PROJECT_REPOSITORY_DEPENDENCY_KEY,
  EMBEDDING_STORE_DEPENDENCY_KEY,
  type RegisterDbDIOptions,
} from './dependency-injection/registerDbDI.ts'
