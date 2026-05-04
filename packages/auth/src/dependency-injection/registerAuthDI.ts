import type { ConfigRepository } from '@t/config'
import { type Container, asClass, dependencyKeys } from '@t/dependency-injection'
import { createGlobalLogger } from '@t/logging'
import type { AuthProvider } from '../entities/ports/AuthProvider.ts'
import type { UserSyncCallback } from '../entities/types/UserSyncCallback.ts'
import { ClerkAuthProvider } from '../infrastructure/clerk/ClerkAuthProvider.ts'
import { NoopAuthProvider } from '../infrastructure/noop/NoopAuthProvider.ts'

/**
 * Re-exported alias of `dependencyKeys.global.AUTH` (owned by
 * `@t/dependency-injection`). Preserved for existing call sites and tests.
 */
export const AUTH_DEPENDENCY_KEY = dependencyKeys.global.AUTH

/**
 * Options bag for {@link registerAuthDI}.
 *
 * The options-bag form is mandatory: it keeps the registrar explicit at
 * the composition root and prevents hidden `process.env` reads from
 * leaking into `@t/auth` itself.
 */
export interface RegisterAuthDIOptions {
  /** Typed config repository sourced from `@t/config`. */
  readonly config: ConfigRepository
  /** Resolved runtime environment; `"testing"` forces the noop provider. */
  readonly environment: 'development' | 'local' | 'testing' | 'production'
  /**
   * Optional `userSync` callback invoked by
   * {@link AuthProvider.syncFromWebhook}. Supplied by the composition root,
   * typically backed by `@t/database`.
   */
  readonly userSync?: UserSyncCallback
  /**
   * Optional list of allowed `azp` / origin values enforced by Clerk token
   * verification. Typically `[webOrigin, apiOrigin, ...]`.
   */
  readonly authorizedParties?: readonly string[]
}

/**
 * Registers the auth binding in the DI container.
 *
 * Selection order for the global provider (first match wins):
 *  1. `environment === "testing"` → {@link NoopAuthProvider}.
 *  2. `!config.auth.clerkSecretKey` → {@link NoopAuthProvider} plus a
 *     `logger.warning` via `@t/logging`.
 *  3. otherwise → {@link ClerkAuthProvider}.
 *
 * Lifetime: singleton under {@link AUTH_DI_KEY}.
 */
export function registerAuthDI(container: Container, opts: RegisterAuthDIOptions): void {
  const Provider = pickProvider(opts)
  container.register({
    [AUTH_DEPENDENCY_KEY]: asClass(Provider).singleton(),
  })
}

function pickProvider(opts: RegisterAuthDIOptions): new () => AuthProvider {
  const { config, environment, userSync, authorizedParties } = opts
  const auth = (config as unknown as { auth?: Record<string, unknown> }).auth ?? {}
  const clerkSecretKey = typeof auth.clerkSecretKey === 'string' ? auth.clerkSecretKey : undefined
  const clerkPublishableKey =
    typeof auth.clerkPublishableKey === 'string' ? auth.clerkPublishableKey : undefined
  const clerkWebhookSecret =
    typeof auth.clerkWebhookSecret === 'string' ? auth.clerkWebhookSecret : undefined

  if (environment === 'testing') {
    return class TestingNoop extends NoopAuthProvider {
      constructor() {
        super({ userSync })
      }
    }
  }

  if (!clerkSecretKey) {
    const logger = createGlobalLogger({})
    logger.warning(
      {
        message:
          'Auth disabled: CLERK_SECRET_KEY is not set. ' + 'Falling back to NoopAuthProvider.',
      },
      '',
    )
    return class MissingKeyNoop extends NoopAuthProvider {
      constructor() {
        super({ userSync })
      }
    }
  }

  const secretKey = clerkSecretKey as string
  const pubKey = clerkPublishableKey as string | undefined
  const webhookSecret = clerkWebhookSecret as string | undefined
  const _parties = authorizedParties
  return class ClerkBound extends ClerkAuthProvider {
    constructor() {
      super({
        clerkSecretKey: secretKey,
        clerkPublishableKey: pubKey,
        clerkWebhookSecret: webhookSecret,
        authorizedParties: _parties,
        userSync,
      })
    }
  }
}
