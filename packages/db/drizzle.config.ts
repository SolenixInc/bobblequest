import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit config — schema introspection + migration authoring.
 *
 * Runtime query layer and migration execution both use the `postgres-js`
 * driver; Drizzle Kit only needs `DATABASE_URL` at dev time to generate
 * migrations and optionally to run `db:push` / `db:studio`.
 *
 * NOTE: migrations/0000_enable_pgvector.sql must be applied BEFORE any
 * generated migration that creates a `vector(...)` column, or the
 * introspection will fail with `type "vector" does not exist`.
 */
export default defineConfig({
  schema: './src/entities/schemas/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Extension-aware migrations: tells drizzle-kit that `vector` is a
  // first-party type so it does not try to drop/recreate the extension
  // on every generation.
  extensionsFilters: ['vector'],
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
})
