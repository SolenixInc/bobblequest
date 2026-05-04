import type { AnalyticsTracker, ScrubOptions } from '@t/analytics-types'
import { type Container, asClass, dependencyKeys } from '@t/dependency-injection'
import { NoOpAnalyticsTracker } from '../infrastructure/NoOpAnalyticsTracker'
import { PostHogBrowserAnalyticsTracker } from '../infrastructure/PostHogBrowserAnalyticsTracker'

/**
 * Options bag for {@link registerAnalyticsBrowserDI}.
 *
 * The options-bag form is mandatory: it keeps the registrar explicit at
 * the composition root and prevents hidden `process.env` reads from
 * leaking into `@t/analytics-browser` itself.
 */
/**
 * Minimal config interface required by this registrar.
 * Uses a `get(key)` method to read NEXT_PUBLIC_* env vars from a browser-safe config.
 */
export interface BrowserConfigAccessor {
  get(key: string): string | undefined
}

export interface RegisterAnalyticsBrowserDIOptions {
  /** Browser config accessor providing NEXT_PUBLIC_* values. */
  readonly config: BrowserConfigAccessor
  /** If true, forces NoOpAnalyticsTracker regardless of config. */
  readonly noOp?: boolean
  /** Optional PII scrub options forwarded to PostHogBrowserAnalyticsTracker. */
  readonly pii?: ScrubOptions
}

/**
 * Registers the analytics bindings in the DI container for browser usage.
 *
 * The tracker is bound to `dependencyKeys.global.ANALYTICS` — the same token
 * used by the server-side `registerAnalyticsDI`, so consumers can resolve
 * uniformly across server and browser environments.
 *
 * Selection order for the global tracker (first match wins):
 *  1. `options.noOp === true` → {@link NoOpAnalyticsTracker}.
 *  2. `typeof window === 'undefined'` → {@link NoOpAnalyticsTracker}.
 *  3. `!config.get('NEXT_PUBLIC_POSTHOG_KEY')` → {@link NoOpAnalyticsTracker} plus a
 *     console warning.
 *  4. otherwise → {@link PostHogBrowserAnalyticsTracker}.
 *
 * Lifetimes:
 *  - Global tracker (`dependencyKeys.global.ANALYTICS`) — `singleton`.
 */
export function registerAnalyticsBrowserDI(
  container: Container,
  opts: RegisterAnalyticsBrowserDIOptions,
): void {
  const { config, noOp = false, pii } = opts
  const posthogKey = config.get('NEXT_PUBLIC_POSTHOG_KEY')
  const posthogHost = config.get('NEXT_PUBLIC_POSTHOG_HOST')

  const globalTracker: new () => AnalyticsTracker = pickGlobalTracker({
    noOp,
    isServer: typeof window === 'undefined',
    posthogKey,
    posthogHost,
    pii,
  })

  container.register({
    [dependencyKeys.global.ANALYTICS]: asClass(globalTracker).singleton(),
  })
}

function pickGlobalTracker(args: {
  noOp: boolean
  isServer: boolean
  posthogKey: string | undefined
  posthogHost: string | undefined
  pii: ScrubOptions | undefined
}): new () => AnalyticsTracker {
  const { noOp, isServer, posthogKey, posthogHost, pii } = args

  if (noOp) {
    return class ForcedNoOp extends NoOpAnalyticsTracker {}
  }

  if (isServer) {
    return class ServerNoOp extends NoOpAnalyticsTracker {}
  }

  if (!posthogKey) {
    const logger = console // Using console for browser environment
    logger.warn(
      'Analytics disabled: NEXT_PUBLIC_POSTHOG_KEY is not set. ' +
        'Falling back to NoOpAnalyticsTracker.',
    )
    return class MissingKeyNoOp extends NoOpAnalyticsTracker {}
  }

  // posthogKey is non-null here: the `!posthogKey` guard above returned early.
  const key = posthogKey as string
  return class PostHogBrowserBound extends PostHogBrowserAnalyticsTracker {
    constructor() {
      super({
        environment: 'production',
        service: 'web',
        apiKey: key,
        host: posthogHost,
        enabled: true,
        pii,
      })
    }
  }
}
