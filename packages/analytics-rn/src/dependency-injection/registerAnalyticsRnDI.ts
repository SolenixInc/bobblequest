import type { AnalyticsTracker, ScrubOptions } from '@t/analytics-types'
import { type Container, asClass, dependencyKeys } from '@t/dependency-injection'
import { NoOpAnalyticsTracker } from '../infrastructure/NoOpAnalyticsTracker'
import { PostHogRnAnalyticsTracker } from '../infrastructure/PostHogRnAnalyticsTracker'

/**
 * Minimal config interface required by this registrar.
 * Uses a `get(key)` method to read env vars from a React Native config.
 */
export interface RnConfigAccessor {
  get(key: string): string | undefined
}

export interface RegisterAnalyticsRnDIOptions {
  /** RN config accessor providing POSTHOG_* values. */
  readonly config: RnConfigAccessor
  /** If true, forces NoOpAnalyticsTracker regardless of config. */
  readonly noOp?: boolean
  /** Optional PII scrub options forwarded to PostHogRnAnalyticsTracker. */
  readonly pii?: ScrubOptions
  /** Optional environment override. */
  readonly environment?: string
}

/**
 * Registers the analytics bindings in the DI container for React Native usage.
 *
 * The tracker is bound to `dependencyKeys.global.ANALYTICS` — the same token
 * used by the server-side `registerAnalyticsDI` and browser `registerAnalyticsBrowserDI`,
 * so consumers can resolve uniformly across environments.
 *
 * Selection order for the global tracker (first match wins):
 *  1. `options.noOp === true` → {@link NoOpAnalyticsTracker}.
 *  2. `!config.get('POSTHOG_API_KEY')` → {@link NoOpAnalyticsTracker} plus a
 *     console warning.
 *  3. otherwise → {@link PostHogRnAnalyticsTracker}.
 *
 * Lifetimes:
 *  - Global tracker (`dependencyKeys.global.ANALYTICS`) — `singleton`.
 */
export function registerAnalyticsRnDI(
  container: Container,
  opts: RegisterAnalyticsRnDIOptions,
): void {
  const { config, noOp = false, pii, environment = 'production' } = opts
  const posthogKey = config.get('POSTHOG_API_KEY')
  const posthogHost = config.get('POSTHOG_HOST')

  const globalTracker: new () => AnalyticsTracker = pickGlobalTracker({
    noOp,
    posthogKey,
    posthogHost,
    pii,
    environment,
  })

  container.register({
    [dependencyKeys.global.ANALYTICS]: asClass(globalTracker).singleton(),
  })
}

function pickGlobalTracker(args: {
  noOp: boolean
  posthogKey: string | undefined
  posthogHost: string | undefined
  pii: ScrubOptions | undefined
  environment: string
}): new () => AnalyticsTracker {
  const { noOp, posthogKey, posthogHost, pii, environment } = args

  if (noOp) {
    return class ForcedNoOp extends NoOpAnalyticsTracker {}
  }

  if (!posthogKey) {
    console.warn(
      'Analytics disabled: POSTHOG_API_KEY is not set. Falling back to NoOpAnalyticsTracker.',
    )
    return class MissingKeyNoOp extends NoOpAnalyticsTracker {}
  }

  // posthogKey is non-null here: the `!posthogKey` guard above returned early.
  const key = posthogKey as string
  return class PostHogRnBound extends PostHogRnAnalyticsTracker {
    constructor() {
      super({
        environment: environment as 'production' | 'local' | 'development' | 'testing',
        service: 'mobile',
        apiKey: key,
        host: posthogHost,
        enabled: true,
        pii,
      })
    }
  }
}
