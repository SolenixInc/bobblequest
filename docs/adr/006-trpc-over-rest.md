# 006 — tRPC over REST

## Status

Accepted

---

## Context and problem statement

The template monorepo exposes a single backend (`apps/api`, Hono + tRPC, port 3001) that all five
client surfaces must consume: `apps/web` (Next.js 15), `apps/website` (Next.js 15 marketing),
`apps/mobile` (Expo 54 / React Native), `apps/desktop` (Electron 32), and any future server-to-
server callers. Without an explicit API contract strategy the codebase faces schema drift — callers
silently pass stale types, breaking at runtime rather than at compile time.

The team is TypeScript-only end-to-end. Any chosen approach must preserve that constraint without
adding a code-generation step that must be re-run on every schema change.

---

## Decision drivers

- End-to-end compile-time type safety: a broken procedure signature must be a TypeScript error in
  every consumer, not a runtime crash
- No codegen step: the contract must be derivable directly from the TypeScript source
- Fast iteration: renaming a procedure or changing its input/output type propagates automatically
- Thin dependency surface: client apps import a type only — no runtime bloat from the server bundle
- No separate schema language: Zod schemas defined once serve both validation and type inference

---

## Considered options

- Option A: REST + OpenAPI (codegen clients)
- Option B: GraphQL (Apollo / Relay)
- Option C: tRPC (chosen)
- Option D: gRPC + protobuf

---

## Decision outcome

Chosen option: **Option C — tRPC** — it is the only option that provides full end-to-end TypeScript
inference without a codegen step while staying within the existing Bun / Zod / TypeScript toolchain.

`apps/api/src/router.ts` exports `AppRouter`. Client apps import `type { AppRouter }` only — zero
runtime dependency on the server code. Procedures are grouped under namespaces (e.g., `auth`,
`users`, `projects`). Input validation is Zod; all procedures run through the shared tRPC context
that surfaces the DI container.

---

## Consequences

### Positive

- Full type inference in every client app: rename a procedure field and TypeScript surfaces every
  broken call site across all five apps at once
- No codegen step: no `openapi-typescript`, no schema-registry CI job, no stale generated files
- Refactors propagate through the type system — the compiler is the contract enforcer
- Zod schemas do double duty: runtime validation at the edge + inferred TypeScript types

### Negative

- Not OpenAPI-compatible out of the box; exposing the API to non-TypeScript consumers requires
  `trpc-openapi` or a thin REST adapter (follow-up tracked in `docs/reference/trpc-api.md`)
- Harder to consume from non-TypeScript clients (cURL, Python scripts, third-party integrations)
- No auto-generated developer-facing docs without `trpc-panel`, `trpc-ui`, or `trpc-openapi`

### Neutral

- API browsing requires `trpc-panel` or `trpc-ui` at a dev-only route — not wired by default; see
  `docs/reference/trpc-api.md` future-work section

---

## Pros and cons of the options

### Option A: REST + OpenAPI (codegen clients)

**Pros:**

- Universal: any language or tool can consume the API
- Excellent tooling ecosystem (Swagger UI, Postman, openapi-generator)
- Familiar to any backend developer

**Cons:**

- Codegen step must run on every schema change; generated files can go stale
- Type drift between server implementation and generated client types is possible
- No enforcement that codegen was re-run before a PR merges without extra CI gate

---

### Option B: GraphQL (Apollo / Relay)

**Pros:**

- Flexible queries; clients request exactly the fields they need
- Strong introspection and tooling (Apollo Studio, GraphiQL)
- Good type-safety story with codegen (graphql-codegen)

**Cons:**

- Requires a codegen step for type-safe clients — same drift risk as REST
- Significant boilerplate: schema SDL, resolvers, context wiring
- Apollo client adds meaningful bundle weight to web and mobile
- Overfetch/underfetch problem solved at the cost of query complexity

---

### Option C: tRPC (chosen)

**Pros:**

- Zero codegen: `AppRouter` type is the contract; consumers import `type` only
- Full end-to-end inference — input, output, error types flow from server to client
- First-class Zod integration for input validation with no duplication
- Minimal bundle impact on clients (type-only import)

**Cons:**

- TypeScript-only: non-TS consumers require an adapter (`trpc-openapi`, REST proxy)
- Less tooling for interactive API exploration compared to GraphQL or OpenAPI
- Procedures must be called via tRPC client; raw HTTP `fetch` bypasses type safety

---

### Option D: gRPC + protobuf

**Pros:**

- Language-agnostic; excellent for polyglot environments
- Strongly typed contracts via `.proto` files
- High performance binary serialization

**Cons:**

- `.proto` is a separate schema language — highest codegen and tooling cost
- Poor browser support without gRPC-Web proxy layer
- Significant setup overhead in a Bun / Node environment
- Orthogonal to the team's TypeScript-first philosophy

---

## Links

- `apps/api/src/router.ts` — `AppRouter` export (single source of truth for the API contract)
- `/docs/reference/trpc-api.md` — API reference and future-work notes (`trpc-openapi`, `trpc-panel`)
- `/docs/tutorials/add-a-trpc-procedure.md` — step-by-step guide for adding new procedures

---

_Last reviewed: 2026-04-28 — owner: TBD_
