# `@t/auth`

Platform-wide authentication port for the monorepo. Authentication is delegated to **Clerk**;
`apps/api` verifies Clerk-issued session JWTs via `@clerk/backend` JWKS, and a Clerk webhook mirrors
the minimal user record into Railway Postgres via `@t/database`. The canonical target-state spec
lives in [`docs/architecture/platform/auth.md`](../../docs/architecture/platform/auth.md).

Every app that needs a verified user depends on the abstract `AuthProvider` port only — never on a
concrete impl. Swapping providers costs one DI registration line.

## Usage

```ts
import { registerAuthDI, AUTH_DI_KEY, type AuthProvider } from "@t/auth";

registerAuthDI(container, {
  config,                 // @t/config ConfigRepository
  environment,            // 'development' | 'local' | 'testing' | 'production'
  authorizedParties: [    // optional — enforced on token `azp` claim
    "https://app.example.com",
    "https://api.example.com",
  ],
  userSync: async (event) => {
    // mirror Clerk user into Postgres via @t/database
  },
});

const auth = container.resolve<AuthProvider>(AUTH_DI_KEY);
const user = await auth.verify(bearerToken);           // throws AuthError on failure
const maybeUser = await auth.currentUser(bearerToken); // null on failure
await auth.syncFromWebhook(verifiedEvent);             // after svix verification
```

## Port surface

`AuthProvider` exposes exactly 3 methods (frozen by `docs/architecture/platform/auth.md`):

| Method | Signature | Purpose |
| --- | --- | --- |
| `verify` | `(token: string) => Promise<AuthUser>` | Validate a Clerk-issued JWT against Clerk's JWKS; throws `AuthError` on expired / tampered / missing / unauthorized. |
| `currentUser` | `(token: string \| null \| undefined) => Promise<AuthUser \| null>` | Convenience for tRPC context — swallows `AuthError` and returns `null`. |
| `syncFromWebhook` | `(event: WebhookEvent) => Promise<void>` | After svix signature verification, apply the event to the mirrored `users` row via the injected `userSync` callback. |

The port intentionally **does not** expose `register` / `login` / `refresh` / `logout`: Clerk owns
the credential + session lifecycle on the client side via its SDKs (`@clerk/nextjs`,
`@clerk/clerk-expo`, `@clerk/clerk-js`). `apps/api` only consumes tokens.

## Implementations

| Impl | When it runs | Notes |
| --- | --- | --- |
| `ClerkAuthProvider` | `environment != 'testing'` and `CLERK_SECRET_KEY` is set | Real impl; wraps `@clerk/backend` `verifyToken` + `users.getUser`. |
| `NoopAuthProvider` | `environment == 'testing'` or `CLERK_SECRET_KEY` unset | Deterministic test double; returns a canned `AuthUser` for any non-empty token. |

## Environment variables

Defined in
[`packages/config/entities/schemas/AuthConfigSchema.ts`](../config/entities/schemas/AuthConfigSchema.ts):

| Variable | Purpose |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Client-side publishable key — consumed by `apps/web`, `apps/mobile`, `apps/desktop`. Safe to expose. |
| `CLERK_SECRET_KEY` | Server-only secret key used by `@clerk/backend`. **Never** ship to clients. |
| `CLERK_WEBHOOK_SECRET` | svix signing secret used by `apps/api` to verify `/webhooks/clerk` payloads. |

`@t/auth` itself never reads `process.env` — the composition root resolves these via `@t/config` and
passes them to `registerAuthDI`.

## Testing

```sh
bun run --filter @t/auth test
```

Runs `vitest run` against `tests/**/*.test.ts`.

## Status

Port + Clerk impl + Noop impl + DI registrar are scaffolded here. Composition-root wiring in
`apps/api` (Hono `clerkAuth` middleware, tRPC context `ctx.user`, `POST /webhooks/clerk` route,
`users.clerk_user_id` migration, client-side `<ClerkProvider>` in web/mobile/desktop) is a follow-up
task tracked in `docs/prd-status/packages/auth.md`.

`AUTH_DI_KEY` is a local `'auth'` const pending promotion into `@t/dependency-injection`
`dependencyKeys.global.AUTH`.
