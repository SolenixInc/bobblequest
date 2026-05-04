import type { AnalyticsTracker, Environment, Service } from '@t/analytics-types'
import type { ConfigRepository } from '@t/config'
import { type Container, asClass, dependencyKeys } from '@t/dependency-injection'
import { NoOpAnalyticsTracker } from '../infrastructure/NoOpAnalyticsTracker.ts'
import { PostHogAnalyticsTrackerImpl } from '../infrastructure/PostHogAnalyticsTrackerImpl.ts'
import { RequestAnalyticsTrackerImpl } from '../infrastructure/RequestAnalyticsTrackerImpl.ts'

/**
 * Options bag for {@link registerAnalyticsDI}.
 *
 * The options-bag form is mandatory: it keeps the registrar explicit at
 * the composition root and prevents hidden `process.env` reads from
 * leaking into `@t/analytics` itself.
 */
export interface RegisterAnalyticsDIOptions {
  /** Typed config repository sourced from `@t/config`. */
  readonly config: ConfigRepository
  /** Resolved runtime environment (typically from `RAILWAY_ENVIRONMENT`). */
  readonly environment: Environment
  /** Compile-time service identity for the running app. */
  readonly service: Service
}

/**
 * Registers the analytics bindings in the DI container.
 *
 * Selection order for the global tracker (first match wins):
 *  1. `environment === "testing"` → {@link NoOpAnalyticsTracker}.
 *  2. `config.analytics.enabled === false` → {@link NoOpAnalyticsTracker}.
 *  3. `!config.analytics.apiKey` → throws `Error` (hard-fail — set POSTHOG_ENABLED=false to opt out).
 *  4. otherwise → {@link PostHogAnalyticsTrackerImpl}.
 *
 * Lifetimes:
 *  - Global tracker (`dependencyKeys.global.ANALYTICS`) — `singleton`.
 *  - Request tracker (`dependencyKeys.request.REQUEST_ANALYTICS`) — `scoped`;
 *    the per-request scope creation (registering `parent`, `requestId`,
 *    `userId`, `sessionIdFromHeader`, `groupKey` into the child container)
 *    is owned by Phase 2 composition-root middleware.
 */
export function registerAnalyticsDI(container: Container, opts: RegisterAnalyticsDIOptions): void {
  const { config, environment, service } = opts
  const { enabled, apiKey, host } = config.analytics

  const globalTracker: new () => AnalyticsTracker = pickGlobalTracker({
    environment,
    service,
    enabled,
    apiKey,
    host,
  })

  container.register({
    [dependencyKeys.global.ANALYTICS]: asClass(globalTracker).singleton(),
    [dependencyKeys.request.REQUEST_ANALYTICS]: asClass(RequestAnalyticsTrackerImpl).scoped(),
  })
}

function pickGlobalTracker(args: {
  environment: Environment
  service: Service
  enabled: boolean
  apiKey: string | undefined
  host: string | undefined
}): new () => AnalyticsTracker {
  const { environment, service, enabled, apiKey, host } = args

  if (environment === 'testing') {
    return class TestingNoOp extends NoOpAnalyticsTracker {
      constructor() {
        super({ environment, service })
      }
    }
  }

  if (enabled === false) {
    return class DisabledNoOp extends NoOpAnalyticsTracker {
      constructor() {
        super({ environment, service })
      }
    }
  }

  if (!apiKey) {
    throw new Error(
      'Analytics misconfiguration: POSTHOG_API_KEY is required but was not set. ' +
        'Set POSTHOG_API_KEY in your environment or use POSTHOG_ENABLED=false to explicitly disable analytics.',
    )
  }

  return class PostHogBound extends PostHogAnalyticsTrackerImpl {
    constructor() {
      super({
        environment,
        service,
        apiKey,
        host,
        enabled: true,
      })
    }
  }
}
