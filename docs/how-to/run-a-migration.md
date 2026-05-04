# How to run a database migration

Applies a Drizzle schema change locally and lands the migration file in version control.

## What this file is for

Step-by-step reference for developers changing `packages/db` schemas. Follow this when you are
ready to apply a schema diff — not when you are still designing the data model.

## When to update it

- The `@t/db` script names change in `packages/db/package.json`
- The migration workflow changes (e.g., Railway deploy step is modified in `railway.toml`)
- A new Drizzle Kit flag or workflow becomes team standard

---

**Audience:** developers changing the Postgres schema
**Prerequisites:** local Postgres running (`bun run stack:up`), `DATABASE_URL` set in
`packages/db/.env` (see `packages/db/.env.example`)
**Outcome:** schema change applied locally, new migration file committed alongside the schema edit

---

## Steps

### 1. Edit the schema

Schema tables live in `packages/db/src/entities/schemas/`. Each file owns one logical table group.

```text
packages/db/src/entities/schemas/
  users.ts       # users table
  projects.ts    # projects table
  embeddings.ts  # pgvector embeddings table
  index.ts       # re-exports all tables for Drizzle Kit
```

Make your change in the relevant file. Example — adding a column to `users`:

```ts
// packages/db/src/entities/schemas/users.ts
export const users = pgTable('users', {
  // ... existing columns
  bio: text('bio'),   // new column
})
```

If you are adding a new table, create a new file and re-export it from `index.ts`.

### 2. Generate the migration

```bash
bun run --filter @t/db db:generate
```

Drizzle Kit introspects the schema diff and writes a new `.sql` file under
`packages/db/migrations/`. The file name is auto-generated (e.g., `0002_<slug>.sql`).

### 3. Inspect the generated SQL

Open the new migration file and read it carefully before applying. Check for:

- Destructive operations: `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN ... TYPE` — these can cause
  data loss. If present, ensure any required backfill runs before or inside the migration.
- Extension dependencies: if your change uses `vector(...)`, confirm
  `0000_enable_pgvector.sql` has already been applied (it must run before any generated migration
  that references the `vector` type — see `packages/db/migrations/README.md`).

### 4. Apply locally

```bash
bun run --filter @t/db db:migrate
```

Drizzle Kit applies all pending migrations to the database pointed at by `DATABASE_URL`.

### 5. Verify

```bash
bun run --filter @t/db db:studio
```

Drizzle Studio opens a browser UI at `https://local.drizzle.studio`. Confirm the new column or
table is present and the data looks as expected.

Alternatively, connect directly via `psql` or your preferred client and inspect the schema.

### 6. Commit

Stage the schema file and the new migration file together — always as a pair:

```bash
git add packages/db/src/entities/schemas/<file>.ts
git add packages/db/migrations/<new-migration>.sql
git add packages/db/migrations/meta/   # journal + snapshot updates
```

Do not stage migration files without the schema change that produced them, and vice versa.

---

## Rollback

Drizzle Kit does not auto-generate rollback migrations. To undo a migration:

- **Local dev:** drop the database and re-apply from scratch:
  `bun run --filter @t/db db:test:down && bun run --filter @t/db db:test:up && bun run --filter
  @t/db db:migrate`
- **Targeted reverse:** hand-craft a new migration file that is the inverse of the change (e.g.,
  `DROP COLUMN bio` if you added `bio`). Generate its meta entry by running `db:generate` after
  reverting the schema file, then apply with `db:migrate`.

Never delete or reorder existing migration files — the journal (`migrations/meta/_journal.json`)
tracks applied state and reordering corrupts it.

---

## Production deployment

Railway runs `db:migrate` as part of the API service's deploy step. Migration execution is
automatic — **never run `db:migrate` against production from your laptop.**

The deploy order is:

1. Railway builds the Docker image from `railway.toml` (`[build] builder = "DOCKERFILE"`).
2. The API service start command runs, which includes the migrate step before the server starts.
3. `DATABASE_URL` is injected from Railway's environment (wired via
   `${{postgres.RAILWAY_PRIVATE_DOMAIN}}` in `railway.toml`).

If a production migration fails, Railway halts the deploy and keeps the previous version running.
Check Railway logs for the Drizzle Kit error output.

---

## Verification

```bash
bunx turbo typecheck --filter @t/db
```

Zero errors confirms the schema types are consistent with the generated migration.

---

## Troubleshooting

- **"type 'vector' does not exist"** — `0000_enable_pgvector.sql` has not been applied. Run it
  manually against the local database before re-running `db:migrate`.
- **"drift detected" / schema out of sync** — run `bunx drizzle-kit check` (from inside
  `packages/db`) to inspect the diff between the journal and the live database.
- **Foreign key violation on migrate** — the migration inserts a column or constraint that
  references rows that do not yet exist. Backfill the data first, then re-apply.
- **Migration file not found** — confirm `packages/db/drizzle.config.ts` `out` field points to
  `./migrations` and the file was actually written by `db:generate`.
- **`DATABASE_URL` empty** — ensure `packages/db/.env` exists and is not gitignored for local dev.
  The schema is `DATABASE_URL=postgresql://user:pass@localhost:5432/dbname`.

---

## See also

- `docs/reference/database-schema.md` — schema reference (tables, columns, relationships)
- `docs/adr/004-drizzle.md` — ADR explaining the Drizzle + pgvector choice
- `packages/db/README.md` — package overview and clean-arch layout
- `packages/db/migrations/README.md` — migration ordering rules (pgvector bootstrap requirement)

---

_Last reviewed: 2026-04-28 — owner: TBD_
