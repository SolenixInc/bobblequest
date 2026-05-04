# Dependency Injection

## Principles

- **Code against interfaces, not concrete classes.** Consumers never instantiate dependencies directly.
- **Type-safe resolution.** Use typed resolver functions or typed keys — never access the raw container or use magic strings.
- **Distributed registration.** Each feature/platform module registers its own dependencies in a dedicated `dependency-injection/` directory. A central wiring function composes them.

## Scope Separation

| Scope | What | Lifetime |
|-------|------|----------|
| Request / Factory | Repos, services, use cases, state holders | Created per request or per access |
| Singleton | Loggers, DB clients, config, HTTP clients | Created once at startup |

- Stateful, request-bound dependencies are request-scoped (or factories).
- Stateless, shared infrastructure is singleton-scoped.

## Configuration

- **Never access environment variables directly** (`process.env`, `Deno.env`, platform env APIs).
- Define config via schemas (Zod or equivalent) — validated at startup (fail-fast).
- Access typed config values through the DI container.

## Implementation Notes

| Language | DI Container |
|----------|-------------|
| TypeScript (Deno/Node) | Awilix — `scoped()` for request, `singleton()` for app-wide |
| Dart (Flutter) | GetIt — `registerLazySingleton()` for singletons, `registerFactory()` for per-access |

## Anti-Patterns

- Direct `new Service()` calls in business logic.
- String-based container lookups (`container.resolve('userService')`).
- Importing concrete implementations in application/delivery layers.
