# Glossary

## What this file is for

A shared vocabulary for the team. When a term has a specific meaning inside this codebase or
domain that differs from its general industry meaning, it belongs here. New team members use
this to orient quickly; existing teammates use it to resolve ambiguity in reviews and incidents.

## When to update it

Update this file when: a new term enters team vocabulary (in a PR, a design doc, a postmortem),
when a term's meaning shifts, or when you catch yourself explaining the same term twice in a week.
Terms are listed alphabetically within each letter section. Each entry links to a canonical
source where one exists.

---

## How to maintain this glossary

1. **Alphabetical order.** Insert new terms in the right position — do not append to the bottom.
2. **Link to canonical source.** If the term is defined by an ADR, a runbook, or a spec doc, link
   it.
3. **One definition per term.** If a term means two different things in two contexts, qualify
   each name (e.g., "Port (Clean Architecture)" vs "Port (networking)").
4. **Keep it current.** When a concept is retired or renamed, update or remove the entry — stale
   definitions cause bugs.
5. **Owner.** Any team member may open a PR to add or correct a term.

---

## A

### AnalyticsTracker

Port that abstracts product analytics event emission. Implementations include
`PostHogAnalyticsTrackerImpl` (real PostHog events) and `NoOpAnalyticsTracker` (null object,
used when analytics is feature-flagged off). Lives in
`packages/analytics-browser/src/entities/ports/`.
See [analytics architecture](architecture/platform/analytics/analytics.md).

### App router

Next.js 13+ file-system routing primitive used in `apps/web` and `apps/website`. All routing
in those apps uses the App Router — no Pages Router patterns are permitted. Server Components
are the default; `"use client"` is added only when browser APIs, event handlers, or client
state are required.

## C

### Composition

The wiring stage where ports get bound to concrete implementations via `buildContainer()`.
Composition happens once at application startup in each app's composition root (e.g.,
`apps/api/src/index.ts`). See [CONVENTIONS.md — Section 9](../CONVENTIONS.md).

### ConfigRepository

Port that exposes env-validated configuration to the rest of the stack. All env var access
flows through a typed config object produced by a Zod schema in `packages/config/entities/schemas/`;
direct `process.env` / `Bun.env` reads outside the config module are forbidden.

## D

### DI registrar

Small function that registers a module's port-to-implementation mapping into the DI container.
Named with the `register*DI` convention (e.g., `registerAnalyticsDI`). Each package owns its
own registrar; the composition root calls them in order at startup.

### Drizzle

TypeScript ORM used for Postgres schema definition and migrations. The Drizzle schema in
`packages/db/src/schema/` is the single source of truth for database types; migrations are
generated via `drizzle-kit generate` and never hand-edited. See
[CONVENTIONS.md — Section 13](../CONVENTIONS.md).

## G

### Golden path

The canonical, supported way to add a new feature or package to this template. Deviation from
the golden path (different layering, different DI pattern, direct env access) requires an ADR
documenting why.

## I

### Impl

Suffix convention for a concrete implementation of a port. The class name is `<AbstractPort>Impl`
(e.g., `PostHogAnalyticsTrackerImpl`). Impls live in the `infrastructure/` layer of their
module and are never imported directly by consumers — they are wired via the DI registrar.

## L

### Lefthook

Pre-commit and commit-msg hook runner configured in `lefthook.yml`. Required for all
contributors; hooks are never skipped (no `--no-verify`, no `LEFTHOOK_EXCLUDE`). The
pre-commit gate runs `biome format`, `biome check`, and `gitleaks protect` on staged files.

## N

### NoOp tracker

Null-object implementation of `AnalyticsTracker` used when analytics is feature-flagged off
(`config.analytics.enabled === false`), when no API key is configured, or when
`environment === "testing"`. Emits no events and never throws. Wired automatically by
`registerAnalyticsDI` — callers do not need to check the flag themselves.

## P

### Port

Pure interface or abstract class that defines a capability without specifying how it is
implemented. Ports live in `entities/ports/` within their package. Outer layers provide
implementations; inner layers declare and consume the port. See
[CONVENTIONS.md — Section 2](../CONVENTIONS.md) and
[analytics architecture](architecture/platform/analytics/analytics.md).

### prd-status

Single source of truth for cross-cutting concern × app readiness. Each file in
`docs/prd-status/` tracks one package or app against all platform concerns
(analytics, billing, auth, logging, etc.). This is the first place to check when evaluating
what has been wired vs what is still a stub.

## R

### Registrar

Synonym for DI registrar. See [DI registrar](#di-registrar).

### RevenueCat

Primary billing SDK across all five app surfaces (web, mobile, desktop). All in-app purchase
and subscription logic uses RevenueCat SDKs. Stripe sits behind RevenueCat as the web payment
processor only and does not surface as a first-class integration in app-side code.

### Runbook

Operational playbook for a specific incident class (e.g., database connection failure, secret
leak). Runbooks are living documents — updated after every incident that exercises them.
Stored in `docs/runbooks/`.

## T

### tRPC

Typed RPC layer connecting `apps/api` to all five client apps. `apps/api` exports `AppRouter`;
each client consumes it via the tRPC client to get end-to-end type safety without a separate
schema generation step. See [CONVENTIONS.md — Section 2](../CONVENTIONS.md).

### Turbo

`turborepo` task runner used for the monorepo build graph. Turbo caches task outputs
(typecheck, lint, build, test) and parallelizes work across packages. All top-level
`bun run` commands (`lint`, `check`, `typecheck`, `test`) are Turbo pipelines defined in
`turbo.json`.

---

_Last reviewed: 2026-04-28 — owner: TBD_
