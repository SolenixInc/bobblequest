# Coding Conventions

Reference guide for all code written in projects built from this template.

**Stack:** Bun | TypeScript (strict) | Turborepo | Biome | tRPC + Hono | Clerk (auth) | Postgres + Drizzle ORM | Next.js 15 | React Native + Expo | Electron | Tailwind v4 + shadcn/ui | Zustand | TanStack Query | Zod | Bun test

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Clean Architecture](#2-clean-architecture)
3. [Single Responsibility Principle](#3-single-responsibility-principle)
4. [Type Safety](#4-type-safety)
5. [Error Handling](#5-error-handling)
6. [Code Quality](#6-code-quality)
7. [Naming Conventions](#7-naming-conventions)
8. [Import Rules](#8-import-rules)
9. [Dependency Injection and Configuration](#9-dependency-injection-and-configuration)
10. [Testing](#10-testing)
11. [Documentation](#11-documentation)
12. [Infrastructure and Logging](#12-infrastructure-and-logging)
13. [Database and Auth Patterns](#13-database-and-auth-patterns)
14. [Frontend Patterns](#14-frontend-patterns)

---

## 1. Project Structure

Within each app (`apps/api`, `apps/web`, `apps/mobile`, `apps/desktop`), organize code as:

```text
src/
├── features/          # Business logic, one directory per domain feature
├── platform/          # Technical capabilities (logging, config, auth wiring)
├── entities/          # Shared domain types and Zod schemas
└── [app entry]        # App bootstrap (index.ts, app.tsx, etc.)
```

**Feature directories** follow a layered structure:

```text
features/
└── user-profile/
    ├── entities/           # Domain types, Zod schemas, interfaces
    ├── applications/       # Use cases and business logic
    ├── delivery/           # tRPC routers, HTTP handlers, React components
    └── infrastructure/     # Drizzle repositories, external API clients
```

**Platform modules** follow a simpler structure:

```text
platform/
└── logging/
    ├── entities/           # Types and interfaces
    ├── infrastructure/     # Implementation
    └── index.ts            # Barrel export (public API)
```

**Tests** live in `tests/` outside `src/`, mirroring the source structure:

```text
tests/
├── unit/
│   └── features/
│       └── user-profile/
│           └── applications/
└── integration/
```

**Rules:**
- Directories use kebab-case.
- Barrel exports (`index.ts`) define the public API of every module.
- Never import from a module's internals -- always go through the barrel.

---

## 2. Clean Architecture

- **Features** contain business logic. **Platform** contains technical capabilities.
- Platform NEVER imports from features. Features may import from platform.
- Dependency flow is strictly inward: `entities` -> `applications` -> `delivery` ->
  `infrastructure`.
- Inner layers define interfaces (ports). Outer layers provide implementations.
- Controllers and delivery layers are thin -- they call use cases and return responses. No business
  logic in delivery.
- tRPC routers are delivery layer. Each procedure calls an application-layer use case.
- Hono middleware belongs in the infrastructure layer.

---

## 3. Single Responsibility Principle

- **One primary declaration per file:** one class, one function, one interface, one type, one
  schema, or one constant.
- **Exception:** A Zod schema and its inferred TypeScript type may coexist in one file.
- Extract helpers to `utils/`, types to `types/`, constants to `constants/`.
- If a file grows beyond a single concern, split it.

---

## 4. Type Safety

- Zero `any`. Zero `@ts-ignore`. Zero `@ts-expect-error`. Zero type assertions (`as`).
- Use `unknown` + type guards or Zod `.parse()` / `.safeParse()` for data of unknown shape.
- All external data is validated at the boundary through Zod schemas:
  - API request/response bodies
  - User input
  - Untrusted external API results
  - Environment variables
- Drizzle queries return typed results inferred from the schema in `@t/db`.
- Prefer `satisfies` over `as` when you need to verify a value matches a type without widening.

---

## 5. Error Handling

- Throw typed errors -- don't return error objects or use result types for exceptional cases.
- All custom errors extend a common `AppError` base class:

```typescript
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}

class NotFoundError extends AppError { /* ... */ }
class ValidationError extends AppError { /* ... */ }
class UnauthorizedError extends AppError { /* ... */ }
```

- Only catch errors if you can meaningfully handle them. Otherwise, let them bubble to the global
  error handler.
- The tRPC error handler maps `AppError` subclasses to `TRPCError` codes automatically.
- External HTTP calls MUST use `AbortController` with a timeout.
- No empty catch blocks. No logging-and-swallowing (catching, logging, then silently continuing).

---

## 6. Code Quality

- Cyclomatic complexity: 10 or fewer per function.
- Maximum 3-4 parameters per function. Beyond that, use an options object.
- Prefer early returns and guard clauses over nested conditionals.
- Prefer pure functions over stateful methods.
- Clean up all disposable resources: event listeners, subscriptions, timers, file handles.
- Biome enforces formatting and lint rules. Never disable Biome rules inline.
- No `console.log` in production code -- use the structured logger from platform.

---

## 7. Naming Conventions

| What | Case | Example |
| --- | --- | --- |
| Classes, types, interfaces, enums | PascalCase | `UserService`, `AuthConfig` |
| Functions, variables, parameters | camelCase | `getUserById`, `isActive` |
| Source code filenames | camelCase | `userService.ts`, `authConfig.ts` |
| Multi-word directories | kebab-case | `user-profile/`, `get-users/` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Non-code files | kebab-case | `api-design.md` |
| Booleans | Prefix: is/has/should/can/will | `isActive`, `hasPermission` |
| Test files | `.test.ts` suffix | `userService.test.ts` |

**Rules:**
- No `_` prefix for private members.
- No Hungarian notation.
- No abbreviations except universally understood ones: `id`, `url`, `db`, `api`, `env`.

---

## 8. Import Rules

- Use path aliases for cross-module imports:
  - `@/features/` -- feature modules
  - `@/platform/` -- platform modules
  - `@/entities/` -- shared domain types
- Use relative imports ONLY within the same feature or module.
- Import from barrel exports (`index.ts`), never from internal paths.
- Use `@t/*` aliases for workspace package imports.
- Dependency direction is enforced:

| Layer | May import from |
| --- | --- |
| `entities/` | Nothing external (pure domain types) |
| `applications/` | `entities`, platform ports |
| `delivery/` | `applications`, `entities` |
| `infrastructure/` | `entities`, ports defined in `applications` |
| `features/*` | `entities`, `platform` |
| `platform/*` | Never `features` |

---

## 9. Dependency Injection and Configuration

**API (tRPC + Hono):**
- Use tRPC context for request-scoped dependencies (authenticated Clerk user, request ID, scoped
  Drizzle client).
- Use Hono middleware for singletons and shared infrastructure (logger, config, Clerk session
  verification).

**Configuration:**
- Never access `process.env` or `Bun.env` directly outside of the config module.
- Define config schemas with Zod, validate at startup, and export typed config objects:

```typescript
const dbConfig = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
}).parse(Bun.env);
```

- Fail fast on invalid configuration -- the app should not start with missing or malformed env vars.

**Drizzle client:**
- Created once as a singleton in `@t/db` and imported by consumers.
- Server-only. Client apps never import the Drizzle client directly -- they go through tRPC.

---

## 10. Testing

- **Runner:** Bun test runner for all tests.
- Every test suite includes three scenario categories:
  - `[SUCCESS]` -- happy path behavior
  - `[ERROR]` -- expected failure modes
  - `[EDGE]` -- boundary conditions and edge cases
- **Unit tests:** Fast, isolated, all external dependencies mocked (Drizzle client, Clerk SDK, HTTP
  clients). Mirror `src/` structure under `tests/unit/`.
- **Integration tests:** Real Postgres instance (local or ephemeral) with Drizzle migrations
  applied; Clerk mocked via test JWTs. Run separately under `tests/integration/`.
- Reset all mocks between tests (`beforeEach` / `afterEach`). Never rely on test ordering.
- 100% test coverage target. Never lower coverage thresholds.
- Test file naming: `<module>.test.ts`, colocated in the `tests/` directory.

---

## 11. Documentation

- TSDoc on all exported functions, classes, interfaces, and types.
- Required tags: `@param`, `@returns`, `@throws`.
- `@example` encouraged for non-trivial APIs.
- No `TODO` comments in code -- use the issue tracker.
- No `@author` tags -- use git blame.
- Document the "why" when the reasoning is non-obvious. Don't document the obvious.

---

## 12. Infrastructure and Logging

- Validate all data at infrastructure boundaries: untrusted external API responses, webhook payloads
  (including Clerk webhooks). Drizzle results are type-safe at the schema level and do not require
  runtime re-validation.
- Structured logging with metadata:

```typescript
logger.info("User created", {
  fileName: "userService.ts",
  userId: user.id,
  intent: "create-user",
});
```

- Required metadata fields: `fileName`, `userId` (when available), `entityId`, `intent`, `error`
  (when applicable).
- Sanitize PII before logging -- never log tokens, passwords, emails, or full request bodies.
- Use request-scoped correlation IDs for distributed tracing.
- External HTTP calls MUST have timeouts via `AbortController`.

---

## 13. Database and Auth Patterns

**Database (Drizzle ORM + Postgres):**
- Use the Drizzle client from `@t/db` for all database access. No raw SQL in application code (use
  Drizzle's `sql` tag sparingly when truly needed).
- Schema is defined in TypeScript in `packages/db/src/schema/` and is the single source of truth.
- Migrations are generated via `drizzle-kit generate` and applied via `bun run --filter @t/db
  db:migrate`. Never hand-edit generated migration files.
- Types are inferred from the Drizzle schema (`InferSelectModel`, `InferInsertModel`) and
  re-exported from `@t/db`.
- The `DATABASE_URL` is used ONLY on the API server, never in client apps (web, mobile, desktop) --
  all DB access flows through tRPC.
- Authorization is enforced in the application layer (protected tRPC procedures + scoped queries by
  Clerk `userId`). No RLS.

**Auth (Clerk):**
- Clerk is the sole authentication provider. No custom auth implementations.
- Web: `@clerk/nextjs` middleware + `auth()` / `currentUser()` on the server.
- Mobile: `@clerk/clerk-expo` with `expo-secure-store` token cache.
- Desktop: Clerk JWT obtained via the browser flow, persisted in `electron-store`, injected on tRPC
  requests.
- API: Clerk session tokens are verified in Hono middleware and the authenticated user is placed on
  tRPC context.

---

## 14. Frontend Patterns

**Next.js (apps/web):**
- Prefer React Server Components by default. Add `"use client"` only when the component needs
  browser APIs, event handlers, or client state.
- Use the App Router. No Pages Router patterns.
- Data fetching happens in Server Components or via tRPC + TanStack Query in Client Components.

**State Management:**
- Zustand for client-only UI state (modals, sidebar open/close, form drafts).
- TanStack Query (via tRPC integration) for all server data. Never store server data in Zustand.

**Styling:**
- shadcn/ui is initialized locally per app -- no shared UI package across apps.
- Shared design tokens are defined in `packages/config/tailwind.config.ts`.
- Each app has its own `cn()` utility (clsx + tailwind-merge).
- Tailwind CSS v4 -- use the new CSS-first configuration where applicable.

**React Native (apps/mobile):**
- NativeWind for styling (Tailwind classes in React Native).
- Expo Router for navigation.
- Platform-specific code uses `.ios.ts` / `.android.ts` suffixes, not runtime checks.
