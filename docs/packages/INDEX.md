# Packages index

The `packages/` workspace contains 17 internal packages following the
template's Clean Architecture conventions. Each package is published only
within the monorepo (`private: true`, version `0.0.0`). Packages are
organized by **concern** (analytics, auth, billing, cache, config, db, di,
errors, logging, queue) — and several concerns ship multiple variants:
a Node/server package, a `-browser` adapter for web bundles, an `-rn` adapter
for React Native, and a shared `-types` package when type defs need to be
imported by all variants without pulling in runtime code.

To add a new package: scaffold under `packages/<name>/` with `package.json`
(name `@t/<name>`, `private: true`, `version: "0.0.0"`, `type: "module"`),
add `AGENTS.md` describing the package's agent rules, and — if the package
introduces a new platform concern — add an architecture doc under
`docs/architecture/platform/<concern>.md`. Wire it into apps via
`packages/dependency-injection`.

## Packages

| Package | Purpose | Layer | Used by |
|---|---|---|---|
| [`@t/analytics`](../architecture/platform/analytics.md) | Node analytics tracker (PostHog adapter) | infrastructure | api |
| `@t/analytics-browser` | Browser PostHog client | adapter | web, website |
| `@t/analytics-rn` | React Native PostHog client | adapter | mobile |
| `@t/analytics-types` | Shared event/tracking type defs | shared | analytics, analytics-browser, analytics-rn |
| [`@t/auth`](../architecture/platform/auth.md) | Clerk auth + JWT verification | infrastructure | api, web, mobile, desktop |
| [`@t/billing`](../architecture/platform/billing.md) | RevenueCat + Stripe backend adapter | infrastructure | api |
| `@t/billing-browser` | RevenueCat browser/web client | adapter | web |
| [`@t/cache`](../architecture/platform/cache.md) | Redis cache port + in-memory fallback | infrastructure | api |
| [`@t/config`](../architecture/platform/config.md) | Zod schemas + env resolution + DI | infrastructure | all apps + packages |
| [`@t/db`](../architecture/platform/database.md) | Drizzle ORM + Postgres + migrations | infrastructure | api |
| [`@t/dependency-injection`](../architecture/platform/dependency-injection.md) | awilix DI container + registrars | tooling | all |
| [`@t/errors`](../architecture/platform/errors.md) | AppError hierarchy + HTTP codecs | shared | api, packages |
| [`@t/logging`](../architecture/platform/logging.md) | Winston server logger (DI-wired) | infrastructure | api |
| `@t/logging-browser` | Browser console + remote logging | adapter | web, website |
| `@t/logging-rn` | React Native logging | adapter | mobile |
| `@t/logging-types` | Log event type defs | shared | logging, logging-browser, logging-rn |
| [`@t/queue`](../architecture/platform/queue.md) | Bull job queue (Redis-backed) | infrastructure | api |

## Conventions

- **Naming.** Package names use the `@t/` scope. Concern variants suffix
  `-browser`, `-rn`, or `-types`.
- **Layer.** *infrastructure* = adapters with side effects (network/db/process).
  *adapter* = a thin client-side variant of an infrastructure concern.
  *shared* = pure types or pure helpers, zero runtime side effects.
  *tooling* = build/wiring code consumed by everyone.
- **Architecture docs.** Concerns with deeper coverage live in
  `docs/architecture/platform/<concern>.md` (linked above). Package-local
  rules live in each package's `AGENTS.md`.
