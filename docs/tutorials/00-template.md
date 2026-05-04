# Tutorial template

**Quadrant:** Tutorials — learning-oriented. The reader is a beginner. You are a guide walking them
through
one complete journey.

---

## What this file is for

This template defines the standard format for every tutorial in `docs/tutorials/`. Follow it when
writing a
new tutorial so that the reader's experience is consistent and predictable across the entire doc
set.

See also: [/docs/index.md](/docs/index.md) |
[Diataxis framework](https://diataxis.fr/)

## When to update it

- The team adopts a new standard section (e.g., "Prerequisites" becomes mandatory)
- Feedback reveals a repeated structural problem in multiple tutorials
- A related ADR changes how we approach learning-oriented content ([/docs/adr/](../adr/))

---

### Why this file exists

Tutorials fail in predictable ways: they assume too much, skip steps, stop before the reader has
something
working, or mix teaching with reference material. This template enforces the contract:

- One concrete journey, start to finish
- The reader produces something real at the end
- Every step is an action, not a concept lecture
- Explanation links out — it does not live here

A tutorial is **not** a how-to guide (no assumed expertise), **not** reference (no exhaustive
lists), and
**not** explanation (no theory unless strictly necessary to proceed).

---

### Worked example

The following tutorial is written using this template. Use it as a reference when authoring.

````markdown
# Tutorial: build a hello-world tRPC procedure

**Time:** 20 minutes
**Skill level:** Beginner — assumes the dev stack is running locally.

## What you will build

By the end of this tutorial you will have:

- Defined a Zod input schema for a `greet` query
- Registered the procedure on the `appRouter`
- Called it from a vitest test using `createCaller`
- Confirmed that TypeScript infers the return type without any manual annotation

## Prerequisites

- Dev stack running locally (`bun dev` in a separate terminal)
- Bun 1.3.11 installed (`bun --version` should print `1.3.11`)
- Familiarity with TypeScript — no tRPC knowledge required

## Step 1 — Define the input schema

Create `apps/api/src/routers/hello/schema.ts`:

```ts
import { z } from 'zod'

export const GreetInput = z.object({ name: z.string().min(1) })
export type GreetInput = z.infer`<typeof GreetInput>`
```

## Step 2 — Write the procedure

Create `apps/api/src/routers/hello/index.ts`:

```ts
import { publicProcedure, router } from '../../trpc'
import { GreetInput } from './schema'

export const helloRouter = router({
  greet: publicProcedure
    .input(GreetInput)
    .query(({ input }) => ({ message: `Hello, ${input.name}!` })),
})
```

## Step 3 — Register on appRouter

Open `apps/api/src/routers/index.ts` and add:

```ts
import { helloRouter } from './hello'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  projects: projectsRouter,
  hello: helloRouter,          // add this line
})
```

## What you learned

- Zod schemas live next to the procedure that uses them
- `publicProcedure.input(...).query(...)` is the standard shape for a read-only endpoint
- Registering on `appRouter` is a one-liner; TypeScript propagates the type to every client automatically
````

---

### Fill-in scaffold

Copy this block when writing a new tutorial. Delete every `<!-- ... -->` comment before publishing.

```markdown
## Tutorial: <TITLE>

**Time:** <ESTIMATE>
**Skill level:** <BEGINNER|INTERMEDIATE|ADVANCED>

## What you will build
<one-paragraph outcome>

## Prerequisites
- <PREREQ-1>
- <PREREQ-2>

## Step 1: <ACTION>
<instructions>

## Step 2: <ACTION>
<instructions>

## What you learned
- <LEARNING-1>
- <LEARNING-2>
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
