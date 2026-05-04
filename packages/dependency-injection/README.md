# `@t/dependency-injection`

Token registry and Awilix re-exports for the monorepo's DI layer. Provides the canonical key strings
every `register*DI` function binds to, the Awilix container primitives, `lifetimeConfig` constants,
and the `Container` type alias. It does not contain registrars or a pre-built composition root —
those live per-package and per-app respectively.

Architecture spec:
[`docs/architecture/platform/dependency-injection.md`](../../docs/architecture/platform/dependency-injection.md).

## Install

Workspace reference — already wired in the monorepo. In any `package.json` that needs it:

```json
{
  "dependencies": {
    "@t/dependency-injection": "workspace:*"
  }
}
```

## Public API

| Export | Kind | Description |
| --- | --- | --- |
| `dependencyKeys` | `const` | Token registry: `dependencyKeys.global.*` (10 singletons) + `dependencyKeys.request.*` (1 scoped) |
| `createContainer` | function | Awilix `createContainer` — construct a new DI container |
| `asClass` | function | Awilix `asClass` — register a class constructor |
| `asFunction` | function | Awilix `asFunction` — register a factory function |
| `asValue` | function | Awilix `asValue` — register a pre-constructed value |
| `InjectionMode` | enum | Awilix injection mode (`PROXY` \| `CLASSIC`) |
| `Lifetime` | enum | Awilix lifetime (`SINGLETON` \| `SCOPED` \| `TRANSIENT`) |
| `lifetimeConfig` | `const` | Options-bag form: `{ SINGLETON, SCOPED, TRANSIENT }` |
| `AwilixContainer` | type | Awilix container type (parametrized) |
| `Container` | type | `AwilixContainer` alias used across registrar signatures |
| `Resolver` | type | Awilix `Resolver<T>` — return type of `asClass` / `asFunction` / `asValue` |

## Quick start — minimal composition root

```ts
import { registerConfigRepo } from '@t/config'
import { registerLoggerDI } from '@t/logging'
import { createContainer, dependencyKeys } from '@t/dependency-injection'

export function buildContainer() {
  const container = createContainer()

  // Config must be first — every other registrar receives it as an option.
  registerConfigRepo(container)
  const config = container.resolve(dependencyKeys.global.CONFIG)

  registerLoggerDI(container, {
    context: { requestId: 'global', metadata: { service: 'my-app' } },
  })

  // Add further register*DI calls here in dependency order.

  return container
}
```

See `apps/api/src/composition.ts` for the full wiring order across all 8 registrars.

## Token reference

### Global (singleton)

| Token | String key | Owning package | Registrar |
| --- | --- | --- | --- |
| `dependencyKeys.global.CONFIG` | `'config'` | `@t/config` | `registerConfigRepo` |
| `dependencyKeys.global.LOGGER_FACTORY` | `'loggerFactory'` | `@t/logging` | `registerLoggerFactoryDI` |
| `dependencyKeys.global.LOGGER` | `'logger'` | `@t/logging` | `registerLoggerDI` |
| `dependencyKeys.global.CACHE` | `'cache'` | `@t/cache` | `registerCacheDI` |
| `dependencyKeys.global.DB` | `'db'` | `@t/db` | `registerDbDI` |
| `dependencyKeys.global.USER_REPOSITORY` | `'userRepository'` | `@t/db` | `registerDbDI` |
| `dependencyKeys.global.EMBEDDING_STORE` | `'embeddingStore'` | `@t/db` | `registerDbDI` |
| `dependencyKeys.global.AUTH` | `'auth'` | `@t/auth` | `registerAuthDI` |
| `dependencyKeys.global.ANALYTICS` | `'analytics'` | `@t/analytics` | `registerAnalyticsDI` |
| `dependencyKeys.global.BILLING_REPOSITORY` | `'billingRepository'` | `@t/billing` | `registerBillingDI` |

### Request-scoped

| Token | String key | Owning package | Registrar |
| --- | --- | --- | --- |
| `dependencyKeys.request.REQUEST_ANALYTICS` | `'requestAnalytics'` | `@t/analytics` | `registerAnalyticsDI` |

## Testing

Tests live in `packages/dependency-injection/tests/` and run via Vitest:

```sh
bun run --filter @t/dependency-injection test
```

The token shape tests (`tests/dependencyKeys.test.ts`) lock the exact string values and count of
every token. If you add or rename a token, these tests fail intentionally — update the assertions as
the checkpoint commit before wiring the registrar.

## More

Full architecture doc, call graph, registrar reference table, composition-root conventions, lifetime
guidance, testing strategy, and new-token workflow:
[`docs/architecture/platform/dependency-injection.md`](../../docs/architecture/platform/dependency-injection.md).
