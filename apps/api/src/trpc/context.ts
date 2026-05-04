import type { AnalyticsTracker } from '@t/analytics'
import type { AuthProvider } from '@t/auth'
import type { CacheClient } from '@t/cache'
import type { DbClient, ProjectRepository, UserRepository } from '@t/db'
import type { QueueClient } from '@t/queue'
/**
 * tRPC per-request context.
 *
 * Auth is sourced from the resolved `AuthProvider` port (via DI), not from
 * `process.env` directly. All heavy infrastructure (db, cache, analytics) is
 * also resolved from the container rather than imported as singletons.
 *
 * When `@hono/trpc-server` is used, the Hono `Context` is passed as the
 * optional third argument.  If the `clerkAuth` middleware has already run,
 * `c.var.userId` / `c.var.user` are pre-populated and we skip a second JWT
 * verification round-trip.
 */
import type { Container } from '@t/dependency-injection'
import { dependencyKeys } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import type { Context as HonoContext } from 'hono'
import { readBearerToken } from '../lib/auth/session'
import type { SessionUser } from '../lib/auth/session'

export type { SessionUser } from '../lib/auth/session'

export interface Context {
  /** Clerk user id extracted from the verified JWT, or null for unauthed requests. */
  userId: string | null
  /** Minimal session-derived user projection, or null for unauthed requests. */
  user: SessionUser | null
  req: Request
  /** Resolved database client from the DI container. */
  db: DbClient | null
  /** Resolved user repository from the DI container. */
  userRepository: UserRepository
  /** Resolved project repository from the DI container. */
  projectRepository: ProjectRepository
  /** Resolved cache client from the DI container. */
  cache: CacheClient
  /** Resolved queue client from the DI container. */
  queue: QueueClient
  /** Resolved logger from the DI container. */
  logger: Logger
  /** Resolved auth provider from the DI container. */
  auth: AuthProvider
  /** Resolved global analytics tracker from the DI container. */
  analytics: AnalyticsTracker
  /** Per-request scoped analytics tracker (resolved from request-scoped container). */
  requestAnalytics: AnalyticsTracker
  [key: string]: unknown
}

/**
 * Creates the tRPC context for each request.
 *
 * Resolves all infrastructure from the DI container. When a Hono context `c`
 * is provided (i.e. the request went through `@hono/trpc-server`) and the
 * `clerkAuth` middleware has already populated `c.var.userId` / `c.var.user`,
 * those values are used directly — avoiding a second JWT verification call.
 *
 * Falls back to inline token extraction + `auth.currentUser` when no Hono
 * context is available (e.g. direct-call test paths that bypass middleware).
 */
export async function createContext(
  { req }: { req: Request },
  container: Container,
  c?: HonoContext,
): Promise<Context> {
  const logger = container.resolve<Logger>(dependencyKeys.global.LOGGER)
  const auth = container.resolve<AuthProvider>(dependencyKeys.global.AUTH)
  const cache = container.resolve<CacheClient>(dependencyKeys.global.CACHE)
  const queue = container.resolve<QueueClient>(dependencyKeys.global.QUEUE)
  const analytics = container.resolve<AnalyticsTracker>(dependencyKeys.global.ANALYTICS)
  const userRepository = container.resolve<UserRepository>(dependencyKeys.global.USER_REPOSITORY)
  const projectRepository = container.resolve<ProjectRepository>(
    dependencyKeys.global.PROJECT_REPOSITORY,
  )

  // DB is optional — in testing environments registerDbDI skips the DB binding.
  let db: DbClient | null = null
  try {
    db = container.resolve<DbClient>(dependencyKeys.global.DB)
  } catch {
    // Not registered (e.g. testing env with in-memory repositories). Procedures
    // that need raw DB access should use UserRepository / EmbeddingStore instead.
  }

  // Per-request analytics: attempt scoped resolution; fall back to global tracker.
  let requestAnalytics: AnalyticsTracker
  try {
    requestAnalytics = container.resolve<AnalyticsTracker>(dependencyKeys.request.REQUEST_ANALYTICS)
  } catch {
    requestAnalytics = analytics
  }

  const base = {
    req,
    db,
    userRepository,
    projectRepository,
    cache,
    queue,
    logger,
    auth,
    analytics,
    requestAnalytics,
  }

  // Fast path: clerkAuth middleware already verified the token and populated
  // Hono context vars.  Use them directly to avoid a second JWT round-trip.
  if (c !== undefined) {
    /* v8 ignore next — c.var is always populated by clerkAuth before reaching tRPC; undefined guard is for safety only */
    const userId = c.var.userId ?? null
    /* v8 ignore next — same as above */
    const user = (c.var.user as SessionUser | null) ?? null
    return { userId, user, ...base }
  }

  // Fallback path: no Hono context (e.g. direct-call test helpers that bypass
  // middleware).  Verify the Bearer token inline.
  const token = readBearerToken(req)
  if (!token) return { userId: null, user: null, ...base }

  try {
    const authUser = await auth.currentUser(token)
    if (!authUser) return { userId: null, user: null, ...base }

    const user: SessionUser = {
      id: authUser.id,
      role: authUser.role ?? null,
      email: authUser.email ?? null,
    }
    return { userId: authUser.id, user, ...base }
  } catch {
    logger.warning(
      { message: 'createContext: token verification failed; treating as unauthenticated' },
      '',
    )
    return { userId: null, user: null, ...base }
  }
}
