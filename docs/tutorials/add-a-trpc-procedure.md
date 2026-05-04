# Tutorial: add a tRPC procedure end-to-end

## What this file is for

This tutorial walks through adding a typed tRPC procedure from schema definition all the way through
to a
React component in `apps/web` and a vitest unit test. Follow it once to understand the full pattern;
the
how-to guides cover individual steps in isolation.

## When to update it

- The procedure base (e.g., `publicProcedure`, `protectedProcedure`) signatures change in
  `apps/api/src/trpc/index.ts`
- The `appRouter` registration location moves
- The web-side tRPC client setup in `apps/web/src/lib/trpc/client.ts` changes
- The test helper `makeContext()` pattern in `apps/api/src/routers/__tests__/` changes

---

**Time:** 60–90 minutes
**Skill level:** Intermediate

## What you will build

A typed `users.greet({ name: string }) -> { message: string }` query that is:

- Validated by Zod at the API boundary
- Registered on the `appRouter` so TypeScript propagates the type to all five client apps
  automatically
- Called from a React component in `apps/web` with full type inference — no codegen, no manual
  casting
- Covered by a vitest unit test using the `createCaller` pattern

## Prerequisites

- Step 1 of [getting-started.md](./getting-started.md) complete — repo cloned, `bun install` done
- Dev stack running (`bun run stack:up && bun dev`)
- Basic familiarity with TypeScript and Zod

## Step 1: define the input/output schema

Create `apps/api/src/routers/users/schema.ts`:

```ts
import { z } from 'zod'

export const GreetInput = z.object({
  name: z.string().min(1).max(100),
})

export const GreetOutput = z.object({
  message: z.string(),
})

export type GreetInput = z.infer<typeof GreetInput>
export type GreetOutput = z.infer<typeof GreetOutput>
```

Keeping the schema in its own file means it can be imported by both the procedure and the test
without
pulling in the full router.

## Step 2: write the procedure in apps/api

Open `apps/api/src/routers/users.ts`. The file already exports `usersRouter`. Add the `greet`
procedure
alongside the existing ones:

```ts
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'
import { GreetInput } from './users/schema'

export const usersRouter = router({
  // ... existing procedures (list, me, update) ...

  greet: publicProcedure
    .input(GreetInput)
    .query(({ input }) => ({
      message: `Hello, ${input.name}!`,
    })),
})
```

`publicProcedure` is used here because greeting does not require authentication. Replace with
`protectedProcedure` if the procedure should require a Clerk session.

## Step 3: register it on the router

`apps/api/src/routers/index.ts` already registers `usersRouter` on `appRouter`:

```ts
import { router } from '../trpc'
import { authRouter } from './auth'
import { projectsRouter } from './projects'
import { usersRouter } from './users'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,      // greet lives here as users.greet
  projects: projectsRouter,
})

export type AppRouter = typeof appRouter
```

No change needed — adding a procedure to `usersRouter` is automatically reflected in `AppRouter`.

## Step 4: type-check propagation across clients

The `AppRouter` type exported from `apps/api/src/routers/index.ts` is re-exported by the `@t/api`
workspace package. All five client apps import it as a type-only import:

```ts
import type { AppRouter } from '@t/api'
```

Run the workspace typecheck to confirm zero errors:

```bash
bun run typecheck
```

TypeScript will error here — not at runtime — if your schema or procedure signature is malformed. No
codegen step, no manual type synchronisation.

## Step 5: call it from apps/web

The web app already has a tRPC React Query client at `apps/web/src/lib/trpc/client.ts`:

```ts
import type { AppRouter } from '@t/api'
import { createTRPCReact } from '@trpc/react-query'

export const trpc = createTRPCReact<AppRouter>()
```

In any React Server Component or Client Component in `apps/web/src/app/`, import `trpc` and call the
hook:

```tsx
// apps/web/src/app/greet/page.tsx
'use client'

import { trpc } from '@/lib/trpc/client'

export default function GreetPage() {
  const { data, isLoading } = trpc.users.greet.useQuery({ name: '<YOUR-NAME>' })

  if (isLoading) return <p>Loading...</p>
  return <p>{data?.message}</p>
}
```

TypeScript infers `data` as `{ message: string } | undefined` — no cast required.

## Step 6: write the procedure test

Add a test in `apps/api/src/routers/__tests__/routers.test.ts` (alongside existing tests) or create
a
dedicated file. Use the `createCaller` pattern already established in the file:

```ts
// apps/api/src/routers/__tests__/routers.test.ts  (append inside the describe block, or add a new one)

describe('users.greet', () => {
  it('returns a greeting message', async () => {
    const caller = appRouter.createCaller(makeContext())
    const result = await caller.users.greet({ name: 'World' })
    expect(result).toEqual({ message: 'Hello, World!' })
  })

  it('rejects an empty name', async () => {
    const caller = appRouter.createCaller(makeContext())
    await expect(caller.users.greet({ name: '' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })
})
```

Run the API tests:

```bash
cd apps/api && bun run test
```

Both assertions should pass. The `makeContext()` helper is already defined at the top of the test
file —
no changes needed there for a `publicProcedure`.

## What you learned

- Zod schemas live in a `schema.ts` file co-located with the router that uses them
- Adding a procedure to an existing sub-router (e.g., `usersRouter`) automatically expands
  `AppRouter`
- `AppRouter` is the single source of truth — all five client apps inherit types from it via
  `@t/api`
- Client apps use `trpc.<namespace>.<procedure>.useQuery(...)` for queries (React Query under the
  hood)
- Procedures are tested with `appRouter.createCaller(makeContext())` — no HTTP layer, no mocking
  needed
- Clean Architecture port/adapter boundaries do not apply to tRPC procedures directly; the
  `AppRouter`
  export is the contract that clients depend on

## Where to go next

- [docs/how-to/add-a-route.md](../how-to/add-a-route.md) — task-focused recipe without tutorial
  narration
- [docs/how-to/add-a-platform-package.md](../how-to/add-a-platform-package.md)
- ADR 006 (tRPC) in [docs/adr/](../adr/) — rationale for choosing tRPC over REST/GraphQL

---

_Last reviewed: 2026-04-28 — owner: TBD_
