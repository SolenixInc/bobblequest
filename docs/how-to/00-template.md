# How-to guide template

**Quadrant:** How-to guides — task-oriented. The reader knows what they want to accomplish. Get
them there without teaching.

---

## What this file is for

This template defines the standard format for every how-to guide in `docs/how-to/`. Follow it when
writing a new guide so readers can scan, act, and move on without reading prose they do not need.

See also: [/docs/index.md](/docs/index.md) |
[Diataxis framework](https://diataxis.fr/)

## When to update it

- A new standard section is adopted team-wide (e.g., mandatory "Rollback" steps)
- Feedback reveals a repeated structural gap across multiple guides
- A related ADR changes how we approach operational documentation ([/docs/adr/](../adr/))

---

### Why this file exists

How-to guides and tutorials are easy to confuse. The key difference:

| | Tutorial | How-to guide |
| --- | --- | --- |
| Reader's state | Beginner, learning | Knows their goal |
| Goal | Build confidence, teach concepts | Complete a specific task |
| Voice | "Let's do this together" | "Here is how" |
| Explanation | Embedded (just enough to proceed) | Linked, not embedded |

A how-to guide **does not** teach. If the reader needs to understand why before they can follow
the steps, link to an explanation doc. Keep the guide itself to: context → prerequisites → steps →
verify → troubleshoot.

Source: [Diataxis documentation framework](https://diataxis.fr/how-to-guides/)

---

### Worked example

```markdown
# How to add a route

Adds a new tRPC procedure to the API so all client apps can call it with full TS types.

**Audience:** developers adding endpoints
**Prerequisites:** repo cloned and `bun run dev` passing locally
**Outcome:** a new procedure callable from any client app with type propagation confirmed

## Steps

### 1. Choose the namespace

Open or create `apps/api/src/routers/<namespace>.ts`. Existing namespaces: `auth`, `users`,
`projects`.

### 2. Define the input schema

```ts
import { z } from 'zod'

const myInput = z.object({ id: z.string().uuid() })
```

### 3. Add the procedure

```ts
export const myRouter = router({
  getById: publicProcedure.input(myInput).query(async ({ ctx, input }) => {
    return ctx.myRepository.findById(input.id)
  }),
})
```

### 4. Register on the app router

In `apps/api/src/routers/index.ts`:

```ts
import { myRouter } from './my'

export const appRouter = router({
  // ... existing
  my: myRouter,
})
```

## Verify

Run `bunx turbo typecheck` — zero errors confirms type propagation.

## Troubleshooting

- **Type does not propagate to client** — confirm `AppRouter` is exported from
  `apps/api/src/routers/index.ts` and re-imported in the client.

```text

---

### Fill-in scaffold

Copy this block when writing a new how-to guide. Delete every `<!-- ... -->` comment before
publishing.

```markdown
# How to <VERB-OBJECT>

<!-- One sentence: what this guide accomplishes. No backstory. -->

**Audience:** <WHO>
**Prerequisites:** <WHAT-YOU-NEED>
**Outcome:** <ENDED-STATE>

## Steps

### 1. <Action>

<!-- One imperative sentence per step. Code block immediately after if needed.
     Do not explain why — link to explanation/ if the reader needs that. -->

### 2. <Action>

<!-- ... -->

## Verification

<!-- How does the reader confirm the task is complete?
     A command with expected output, a UI state, a test that passes. -->

## Troubleshooting

<!-- Bullet list of known failure modes and how to fix them.
     Format: **Symptom** — Cause. Fix: `command` or link. -->

## Related

<!-- Cross-links: related how-to guides, the tutorial that teaches this area,
     the reference doc for the tool used, and the explanation of why. -->
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
