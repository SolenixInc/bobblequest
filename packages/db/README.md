# @t/db

Data-access package for the monorepo. Railway Postgres + `pgvector`, accessed through the `DbClient`
abstract port (backed by Drizzle ORM over the `postgres-js` driver) plus two domain ports —
`UserRepository` and `EmbeddingStore`.

## Layout

```text
packages/db/
├── drizzle.config.ts                 # drizzle-kit config
├── migrations/                       # SQL baseline; regenerate via db:generate
├── src/
│   ├── entities/
│   │   ├── ports/                    # DbClient, UserRepository, EmbeddingStore
│   │   ├── schemas/                  # Drizzle tables: users, embeddings
│   │   └── types/                    # plain-TS domain shapes
│   ├── infrastructure/
│   │   ├── drizzle/                  # postgres-js-backed impls
│   │   └── in-memory/                # Map-backed test doubles
│   ├── dependency-injection/
│   │   └── registerDbDI.ts           # Awilix registrar
│   └── index.ts
└── tests/
```

## Consumers

Always depend on a port, never an impl:

```ts
import type { UserRepository } from '@t/db'

export class ClerkWebhookHandler {
  constructor(private readonly users: UserRepository) {}
}
```

## Wiring (composition root)

```ts
import { registerDbDI } from '@t/db'

registerDbDI(container, { config, environment: 'production' })
```

## Driver

- Runtime: `postgres-js` (Bun-compatible, small, tagged-template ergonomics).
- ORM / migration tool: `drizzle-orm` + `drizzle-kit`.
- Extension: `pgvector` — enabled via `migrations/0000_enable_pgvector.sql` before any `vector(...)`
  column materializes.

See `docs/prd-status/packages/db.md` for the current bootstrap status and
`docs/architecture/platform/database.md` for the target architecture.
