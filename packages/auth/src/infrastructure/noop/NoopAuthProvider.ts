/**
 * Deterministic no-op / in-memory {@link AuthProvider} for tests and local
 * dev when Clerk is not configured. Returns a canned {@link AuthUser} for
 * any non-empty token, `null` for empty, and routes webhook events through
 * an optional `userSync` callback just like the Clerk impl.
 *
 * Use via `registerAuthDI` by supplying `environment: "testing"` or omitting
 * `clerkSecretKey` — never construct directly in application code.
 */
import { AuthProvider } from '../../entities/ports/AuthProvider.ts'
import type { AuthUser } from '../../entities/schemas/AuthUserSchema.ts'
import type { WebhookEvent } from '../../entities/schemas/WebhookEventSchema.ts'
import type { AuthProviderOptions } from '../../entities/types/AuthProviderOptions.ts'
import type { UserSyncCallback } from '../../entities/types/UserSyncCallback.ts'

export interface NoopAuthProviderOptions extends AuthProviderOptions {
  /** Canned user returned for any non-empty token. Defaults to a stable stub. */
  stubUser?: AuthUser
}

const DEFAULT_STUB_USER: AuthUser = {
  id: 'user_noop',
  email: 'noop@example.com',
  firstName: 'Noop',
  lastName: 'User',
  imageUrl: null,
  role: null,
}

export class NoopAuthProvider extends AuthProvider {
  private readonly stubUser: AuthUser
  private readonly userSync: UserSyncCallback | undefined

  constructor(opts: NoopAuthProviderOptions = {}) {
    super()
    this.stubUser = opts.stubUser ?? DEFAULT_STUB_USER
    this.userSync = opts.userSync
  }

  verify(token: string): Promise<AuthUser> {
    if (!token) {
      return Promise.reject(new Error('NoopAuthProvider.verify requires a non-empty token'))
    }
    return Promise.resolve(this.stubUser)
  }

  currentUser(token: string | null | undefined): Promise<AuthUser | null> {
    if (!token) return Promise.resolve(null)
    return Promise.resolve(this.stubUser)
  }

  async syncFromWebhook(event: WebhookEvent): Promise<void> {
    if (!this.userSync) return
    await this.userSync(event)
  }
}
