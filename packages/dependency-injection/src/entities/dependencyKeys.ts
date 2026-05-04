/**
 * Central registry of DI tokens used across the monorepo.
 *
 * Every `register*DI.ts` function registers its binding under a key
 * listed here. Consumers resolve via `container.resolve(dependencyKeys.global.X)`.
 *
 * Tokens are grouped by lifetime:
 * - `global`: singletons created once per composition root.
 * - `request`: scoped instances created per inbound HTTP request.
 */
export const dependencyKeys = {
  global: {
    /** Singleton config repository (@t/config). */
    CONFIG: 'config',
    /** Singleton logger factory (@t/logging). */
    LOGGER_FACTORY: 'loggerFactory',
    /** Singleton global analytics tracker (@t/analytics). */
    ANALYTICS: 'analytics',
    /** Singleton cache client (@t/cache). */
    CACHE: 'cache',
    /** Singleton database client (@t/db). */
    DB: 'db',
    /** Singleton user repository (@t/db). */
    USER_REPOSITORY: 'userRepository',
    /** Singleton embedding store (@t/db). */
    EMBEDDING_STORE: 'embeddingStore',
    /** Singleton billing repository (@t/billing). */
    BILLING_REPOSITORY: 'billingRepository',
    /** Singleton project repository (@t/db). */
    PROJECT_REPOSITORY: 'projectRepository',
    /** Singleton auth provider (@t/auth). */
    AUTH: 'auth',
    /** Singleton background job queue (@t/queue). */
    QUEUE: 'queue',
    /** Singleton global logger instance (@t/logging). */
    LOGGER: 'logger',
  },
  request: {
    /** Per-request analytics tracker stamped with distinct_id/session. */
    REQUEST_ANALYTICS: 'requestAnalytics',
  },
} as const
