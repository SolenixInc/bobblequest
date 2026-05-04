# Reference: database schema

## What this file is for

Inventory of every table, column, relationship, index, and migration in the `@t/db` package.
Use it to understand the data model before writing queries, adding columns, or authoring a new
migration.

## When to update it

Update this file whenever a schema file under `packages/db/src/entities/schemas/` changes — new
tables, dropped columns, added indexes, or new FK constraints. Also update the Migrations section
after running `bun run --filter @t/db db:generate`.

## How to regenerate

Source of truth is `packages/db/src/entities/schemas/index.ts` (re-exports all Drizzle table
definitions). v1 is hand-curated. Future TODO: automate via `drizzle-kit introspect` or
schemaspy to produce this file in CI.

---

## Tables

### `users`

App-side mirror of the Clerk-owned identity. Auth state (passwords, sessions, MFA) lives in
Clerk only — this table holds denormalized profile data used for joins and display.

Source: `packages/db/src/entities/schemas/users.ts`

| Column | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Internal primary key (UUID v4) |
| `clerk_user_id` | `text` | no | — | Clerk `user_xxx` identity; UNIQUE constraint |
| `email` | `text` | no | — | Denormalized from Clerk; updated via webhook |
| `display_name` | `text` | yes | — | User-editable display name |
| `avatar_url` | `text` | yes | — | Profile avatar URL |
| `created_at` | `timestamptz` | no | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | no | `now()` | Last update timestamp |

---

### `projects`

Per-user project records. Owner scoping uses `owner_id` (FK to `users.id`).

Source: `packages/db/src/entities/schemas/projects.ts`

| Column | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Internal primary key (UUID v4) |
| `name` | `text` | no | — | Human-readable project title |
| `description` | `text` | yes | — | Optional free-form description |
| `owner_id` | `uuid` | no | — | FK → `users.id` (cascade delete) |
| `status` | `project_status` enum | no | `'active'` | Lifecycle: `active`, `archived`, `deleted` |
| `created_at` | `timestamptz` | no | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | no | `now()` | Last update timestamp |

---

### `embeddings`

pgvector-backed k-NN store. One row per indexed chunk of a source artifact.

Requires the `vector` extension: `CREATE EXTENSION IF NOT EXISTS vector` (applied in migration
`0000_secret_miss_america`).

Default embedding dimensionality: **1536** (matches OpenAI `text-embedding-3-small`). Change
`DEFAULT_EMBEDDING_DIMENSIONS` in the schema file and regenerate if you adopt a different model.

Source: `packages/db/src/entities/schemas/embeddings.ts`

| Column | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Internal primary key (UUID v4) |
| `source_type` | `text` | no | — | Parent artifact type (e.g. `'document'`) |
| `source_id` | `text` | no | — | Parent artifact id (e.g. a doc UUID) |
| `chunk_index` | `integer` | no | `0` | Preserves chunk order for multi-chunk sources |
| `content` | `text` | no | — | Raw text chunk that was embedded |
| `metadata` | `jsonb` | yes | — | Arbitrary key/value metadata attached to the chunk |
| `embedding` | `vector(1536)` | no | — | pgvector embedding; HNSW-indexed with cosine ops |
| `created_at` | `timestamptz` | no | `now()` | Row creation timestamp |

---

## Relationships

| Child table | Column | Parent table | Column | On delete |
| --- | --- | --- | --- | --- |
| `projects` | `owner_id` | `users` | `id` | `CASCADE` |

No FK relationships touch `embeddings` — source identity is stored as loose `text` fields
(`source_type` + `source_id`) to avoid coupling the embedding store to any specific domain table.

---

## Indexes

| Index name | Table | Columns | Method | Purpose |
| --- | --- | --- | --- | --- |
| `users_clerk_user_id_idx` | `users` | `clerk_user_id` | btree | O(1) lookup by Clerk user ID (webhook handler) |
| `users_email_idx` | `users` | `email` | btree | Lookup by email |
| `projects_owner_id_idx` | `projects` | `owner_id` | btree | Fast owner-scoped project queries |
| `projects_status_idx` | `projects` | `status` | btree | Filter by lifecycle status |
| `embeddings_source_idx` | `embeddings` | `source_type, source_id` | btree | Fetch all chunks for a given source |
| `embeddings_hnsw_cosine_idx` | `embeddings` | `embedding` | hnsw (cosine) | k-NN similarity search via `vector_cosine_ops` |

---

## Migrations

Migrations live in `packages/db/migrations/`. They are authored by drizzle-kit and applied by
the Drizzle migrator at startup (or manually).

| File | Tag | Contents |
| --- | --- | --- |
| `0000_secret_miss_america.sql` | initial schema | Creates `vector` extension, `users` table, `embeddings` table, btree and HNSW indexes |
| `0001_magenta_omega_red.sql` | projects table | Creates `project_status` enum, `projects` table, FK to `users.id` (cascade delete), btree indexes |

**Author a new migration:**

```bash
bun run --filter @t/db db:generate
```

**Apply pending migrations:**

```bash
bun run --filter @t/db db:migrate
```

Drizzle's journal file is at `packages/db/migrations/meta/_journal.json`.

---

## ERD

TODO: generate via `drizzle-kit studio` (interactive) or a schemaspy / mermaid-based CI step.

```text
users
  id (PK)
  clerk_user_id (UNIQUE)
  email
  display_name
  avatar_url
  created_at
  updated_at
       |
       | 1:N (projects.owner_id → users.id, CASCADE DELETE)
       v
projects
  id (PK)
  name
  description
  owner_id (FK → users.id)
  status
  created_at
  updated_at

embeddings   (no FK — loose source_type / source_id coupling)
  id (PK)
  source_type
  source_id
  chunk_index
  content
  metadata
  embedding (vector 1536, HNSW cosine)
  created_at
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
