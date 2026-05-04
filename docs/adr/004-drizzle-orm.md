# 004 — Drizzle ORM

## Status

Accepted

---

## Context and problem statement

The monorepo needs type-safe database access to a Railway-hosted Postgres instance with `pgvector`
enabled. Several consumers exist:
the API server (`apps/api`), future job workers, and any server-side code in the mobile/desktop
backends. Migrations must be
schema-first, reproducible, and committable to the repo without a separate migration-management
service.

An earlier experiment (`feat/auth-stack-migration`) explored using the Supabase JS client directly.
That branch was reverted; the team
decided to own the data-access layer cleanly rather than coupling to a vendor client.

---

## Decision drivers

- TypeScript-native: schema and query types must be inferred without codegen steps
- Postgres-first: full support for Postgres-specific types, operators, and extensions (especially
  `pgvector`)
- Lightweight runtime bundle: ORM must not significantly inflate server bundle size
- Schema-as-code: tables defined in TypeScript, migrations generated from the schema diff
- Migration workflow: a simple `drizzle-kit generate` + `drizzle-kit migrate` loop committed
  alongside application code
- Multiple consumers: the `@t/db` package must be importable by any app or package in the monorepo

---

## Considered options

- Option A: Prisma
- Option B: Drizzle (chosen)
- Option C: Kysely
- Option D: Raw SQL

---

## Decision outcome

Chosen option: **Option B — Drizzle** — Drizzle ORM + `drizzle-kit` for migrations. Schema lives in
`packages/db/src/entities/schemas/`. Generated SQL migrations land in `packages/db/migrations/`. The
`postgres-js` driver is used
at runtime (Bun-compatible, small, ergonomic tagged-template interface). `pgvector` is enabled via
the baseline migration
`0000_enable_pgvector.sql`.

---

## Consequences

### Positive

- Full type inference from schema to query results — no codegen step, no generated client to commit
- Native `pgvector` support via Drizzle's extension hooks
- Lightweight runtime: Drizzle adds minimal overhead compared to Prisma's query engine
- `drizzle-kit generate` produces plain SQL migrations that are human-readable and
  version-controlled
- Schema changes are single-source: update the TypeScript table definition, run generate, apply

### Negative

- Drizzle community and documentation are smaller than Prisma's; some advanced query patterns
  require the raw SQL escape hatch
- Relational queries (joins, nested selects) require more explicit construction than Prisma's
  `include`
- `drizzle-kit` studio is optional; no built-in admin UI for the DB by default

### Neutral

- Drizzle Studio is available as an optional local dev tool but is not deployed or expected in any
  environment
- Migration files are plain SQL and can be applied by any Postgres migration runner if the team ever
  moves off `drizzle-kit`

---

## Pros and cons of the options

### Option A: Prisma

**Pros:**

- Largest ORM community in the Node/TS ecosystem; extensive documentation and examples
- `prisma studio` provides a built-in GUI
- `@prisma/client` has excellent type inference for most query patterns

**Cons:**

- Requires a codegen step (`prisma generate`) before TypeScript can resolve query types — adds
  latency to CI and local dev
- Prisma's query engine binary adds ~10–40 MB to server bundles
- `pgvector` support is indirect and less ergonomic than Drizzle's first-class extension support
- Bun compatibility has had edge cases; codegen step adds friction to Bun-native workflows

---

### Option B: Drizzle (chosen)

**Pros:**

- Zero codegen: TypeScript types are inferred directly from the schema definition file
- First-class `pgvector` column type and operator support
- Minimal runtime footprint
- Plain SQL migration files — portable, inspectable, no lock-in to `drizzle-kit` for deployment

**Cons:**

- Smaller community than Prisma
- Complex relational queries require explicit join construction
- No bundled admin UI

---

### Option C: Kysely

**Pros:**

- Excellent type-safe query builder
- Lightweight; no codegen

**Cons:**

- Query builder only — no migration tooling; would require a separate migration layer (e.g.,
  `db-migrate`, raw SQL)
- Schema drift between migration SQL and TypeScript types is the developer's responsibility
- Less ergonomic for schema-first workflows compared to Drizzle

---

### Option D: Raw SQL

**Pros:**

- Maximum control; no abstraction overhead
- Zero dependencies beyond the `postgres-js` driver

**Cons:**

- No TypeScript type safety on query results — every return type must be cast or asserted manually
- Migration management is fully manual
- Refactoring column names or types is error-prone without static analysis support

---

## Links

- DB package README: /packages/db/README.md
- Migration how-to: /docs/how-to/run-a-migration.md
- Database schema reference: /docs/reference/database-schema.md

---

_Last reviewed: 2026-04-28 — owner: TBD_
