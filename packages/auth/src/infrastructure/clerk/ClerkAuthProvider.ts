/**
 * Clerk adapter for the {@link AuthProvider} port.
 *
 * Wraps `@clerk/backend`'s `verifyToken` (JWKS-cached, networkless on the hot
 * path after warm-up) and `createClerkClient` for user-metadata reads. Never
 * issues tokens — that is entirely Clerk's job via its client SDKs.
 *
 * No Clerk types leak out of this file: the port returns the provider-agnostic
 * {@link AuthUser} projection.
 */
import { type ClerkClient, createClerkClient, verifyToken } from '@clerk/backend'
import { AuthProvider } from '../../entities/ports/AuthProvider.ts'
import { type AuthUser, AuthUserSchema } from '../../entities/schemas/AuthUserSchema.ts'
import { SessionClaimsSchema } from '../../entities/schemas/SessionClaimsSchema.ts'
import type { WebhookEvent } from '../../entities/schemas/WebhookEventSchema.ts'
import { AuthError } from '../../entities/types/AuthError.ts'
import type { AuthProviderOptions } from '../../entities/types/AuthProviderOptions.ts'
import type { UserSyncCallback } from '../../entities/types/UserSyncCallback.ts'

export interface ClerkAuthProviderOptions extends AuthProviderOptions {
  /** Clerk server-side secret key (required for ClerkAuthProvider). */
  clerkSecretKey: string
  /** Injectable Clerk client factory (overrideable for tests). */
  clerkClientFactory?: (opts: { secretKey: string; publishableKey?: string }) => ClerkClient
  /** Injectable token verifier (overrideable for tests). */
  tokenVerifier?: typeof verifyToken
}

export class ClerkAuthProvider extends AuthProvider {
  private readonly clerkClient: ClerkClient
  private readonly secretKey: string
  private readonly authorizedParties: readonly string[] | undefined
  private readonly userSync: UserSyncCallback | undefined
  private readonly tokenVerifier: typeof verifyToken

  constructor(opts: ClerkAuthProviderOptions) {
    super()
    if (!opts.clerkSecretKey) throw new TypeError('clerkSecretKey required')
    this.secretKey = opts.clerkSecretKey
    this.authorizedParties = opts.authorizedParties
    this.userSync = opts.userSync
    this.tokenVerifier = opts.tokenVerifier ?? verifyToken
    const factory = opts.clerkClientFactory ?? createClerkClient
    this.clerkClient = factory({
      secretKey: opts.clerkSecretKey,
      publishableKey: opts.clerkPublishableKey,
    })
  }

  async verify(token: string): Promise<AuthUser> {
    if (!token) {
      throw new AuthError('TOKEN_MISSING')
    }

    let payload: unknown
    try {
      payload = await this.tokenVerifier(token, {
        secretKey: this.secretKey,
        authorizedParties: this.authorizedParties ? [...this.authorizedParties] : undefined,
      })
    } catch (cause) {
      throw this.wrapVerifyError(cause)
    }

    const parsed = SessionClaimsSchema.safeParse(payload)
    if (!parsed.success) {
      throw new AuthError('TOKEN_INVALID', 'Session claims failed schema validation')
    }

    return this.hydrateUser(parsed.data.sub)
  }

  async currentUser(token: string | null | undefined): Promise<AuthUser | null> {
    if (!token) return null
    try {
      return await this.verify(token)
    } catch (err) {
      if (err instanceof AuthError) return null
      throw err
    }
  }

  async syncFromWebhook(event: WebhookEvent): Promise<void> {
    if (!this.userSync) return
    await this.userSync(event)
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async hydrateUser(userId: string): Promise<AuthUser> {
    let raw: Awaited<ReturnType<ClerkClient['users']['getUser']>>
    try {
      raw = await this.clerkClient.users.getUser(userId)
    } catch (cause) {
      throw new AuthError('USER_NOT_FOUND', `Clerk user lookup failed for ${userId}`, { cause })
    }

    const primaryEmailId = raw.primaryEmailAddressId ?? null
    const primaryEmail =
      raw.emailAddresses?.find((e) => e.id === primaryEmailId)?.emailAddress ??
      raw.emailAddresses?.[0]?.emailAddress ??
      null

    const roleClaim = (raw.publicMetadata as Record<string, unknown> | undefined)?.role

    return AuthUserSchema.parse({
      id: raw.id,
      email: primaryEmail,
      firstName: raw.firstName ?? null,
      lastName: raw.lastName ?? null,
      imageUrl: raw.imageUrl ?? null,
      role: typeof roleClaim === 'string' ? roleClaim : null,
    })
  }

  private wrapVerifyError(cause: unknown): AuthError {
    const message = cause instanceof Error ? cause.message : String(cause)
    const lowered = message.toLowerCase()
    if (lowered.includes('expired')) {
      return new AuthError('TOKEN_EXPIRED', message, { cause })
    }
    if (lowered.includes('signature') || lowered.includes('tampered')) {
      return new AuthError('TOKEN_TAMPERED', message, { cause })
    }
    if (lowered.includes('authorized') || lowered.includes('azp')) {
      return new AuthError('UNAUTHORIZED_PARTY', message, { cause })
    }
    return new AuthError('TOKEN_INVALID', message, { cause })
  }
}
