import type { AuthProvider } from '@t/auth'
import type { AwilixContainer } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import type { MiddlewareHandler } from 'hono'
import { readBearerToken } from '../lib/auth/session'
import type { SessionUser } from '../lib/auth/session'

export type { SessionUser } from '../lib/auth/session'

/**
 * Hono context variable bindings injected by `clerkAuth` middleware.
 * Consumers read via `c.var.userId` / `c.var.user`.
 */
export interface ClerkAuthVariables {
  userId: string | null
  user: SessionUser | null
}

/**
 * Factory that returns a Hono middleware which resolves the current Clerk
 * session from the `Authorization: Bearer <token>` header and writes
 * `userId` / `user` into Hono context variables.
 *
 * Auth is intentionally **non-blocking**: missing or invalid tokens set both
 * variables to `null` and call `next()`. Authorization decisions (e.g.
 * rejecting unauthenticated requests) belong to downstream layers such as
 * tRPC `protectedProcedure` or route-level guards.
 *
 * @param container — the awilix composition root; `AUTH` and `LOGGER` tokens
 *   are resolved once per request from this container.
 */
export function createClerkAuthMiddleware(
  container: AwilixContainer,
): MiddlewareHandler<{ Variables: ClerkAuthVariables }> {
  return async (c, next) => {
    const logger =
      ((c.var as Record<string, unknown>).logger as Logger) ??
      container.resolve<Logger>(dependencyKeys.global.LOGGER)
    const auth = container.resolve<AuthProvider>(dependencyKeys.global.AUTH)

    const token = readBearerToken(c.req.raw)

    if (!token) {
      c.set('userId', null)
      c.set('user', null)
      await next()
      return
    }

    try {
      const authUser = await auth.currentUser(token)

      if (!authUser) {
        c.set('userId', null)
        c.set('user', null)
        await next()
        return
      }

      const user: SessionUser = {
        id: authUser.id,
        role: authUser.role ?? null,
        email: authUser.email ?? null,
      }

      c.set('userId', authUser.id)
      c.set('user', user)
    } catch {
      logger.warning(
        { message: 'clerkAuth: token verification failed; treating as unauthenticated' },
        '',
      )
      c.set('userId', null)
      c.set('user', null)
    }

    await next()
  }
}
