# @t/analytics-browser

Browser-side `AnalyticsTracker` implementation backed by
[`posthog-js`](https://posthog.com/docs/libraries/js). Implements the port from
`@t/analytics-types`, scrubs every user-controlled payload through the shared PII scrubber, and
registers under the same DI token as the server adapter so consumers resolve uniformly across
environments.

## Install

This is a workspace package in the template-repo monorepo:

```sh
bun add @t/analytics-browser
```

## Features

- Implements the `AnalyticsTracker` port from `@t/analytics-types`.
- Browser-optimised PostHog integration via `posthog-js`.
- PII scrubbing at the port boundary using the shared scrubber from `@t/analytics-types`.
- React context provider and hooks (`useAnalytics`, `useIdentify`, `usePageView`).
- Clerk integration bridge.
- Awilix DI registrar binding to `dependencyKeys.global.ANALYTICS`.
- NoOp fallback for SSR contexts and missing `NEXT_PUBLIC_POSTHOG_KEY`.
- 55 tests passing.

## Dependency Injection

```ts
import { createContainer } from 'awilix'
import { registerAnalyticsBrowserDI } from '@t/analytics-browser/dependency-injection/registerAnalyticsBrowserDI'
import { dependencyKeys } from '@t/dependency-injection'

const container = createContainer()

registerAnalyticsBrowserDI(container, {
  config,            // BrowserConfigAccessor: { get(key): string | undefined }
  noOp: false,       // optional — force NoOp regardless of config
  pii: {             // optional — forwarded to PostHogBrowserAnalyticsTracker
    extraKeys: ['internalUserRef'],
    allowKeys: ['locale'],
    replaceWith: '[redacted]',
    skipPatterns: ['ip'],
  },
})

const analytics = container.resolve(dependencyKeys.global.ANALYTICS)
analytics.capture('app_started', 'anon')
```

The registrar reads two keys from the supplied `config` accessor:

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key. Missing key → `NoOpAnalyticsTracker` + console warning. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional ingestion host. Defaults to `https://us.i.posthog.com`. |

Selection order (first match wins):

1. `options.noOp === true` → `NoOpAnalyticsTracker`
2. `typeof window === 'undefined'` (SSR) → `NoOpAnalyticsTracker`
3. `!config.get('NEXT_PUBLIC_POSTHOG_KEY')` → `NoOpAnalyticsTracker` + warn
4. otherwise → `PostHogBrowserAnalyticsTracker`

The tracker is registered as a singleton under `dependencyKeys.global.ANALYTICS` — the same token
used by the server `registerAnalyticsDI` and the RN `registerAnalyticsRnDI`.

## Direct Construction

If you need to instantiate the tracker outside DI (tests, ad-hoc tooling):

```ts
import { PostHogBrowserAnalyticsTracker } from '@t/analytics-browser'
import type { ScrubOptions } from '@t/analytics-types'

const tracker = new PostHogBrowserAnalyticsTracker({
  environment: 'production',     // 'production' | 'local' | 'development' | 'testing'
  service: 'web',
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  enabled: true,
  pii: { extraKeys: ['internalUserRef'] } satisfies ScrubOptions,
})
```

## PII Scrubber Wiring

Every port method that accepts a properties or traits bag funnels it through the shared scrubber
from `@t/analytics-types` before forwarding to `posthog-js`:

| Method | Scrubber call |
| --- | --- |
| `capture` | `scrubPiiFromProperties(properties, pii)` |
| `captureException` | flattens `error.message` / `error.name` / `error.stack` into the bag, then `scrubPiiFromProperties` over the merged bag |
| `identify` | `scrubPiiFromTraits(traits, pii)` |
| `group` | `scrubPiiFromTraits(traits, pii)` |
| `captureRevenue` | `scrubPiiFromProperties(event.meta, pii)` |
| `captureLlm` | `scrubPiiFromProperties(event.meta, pii)` |

Reserved PostHog super-props (`$environment`, `$service`, `$session_id`, `distinct_id`,
`request_id`, `$group`) pass through untouched. Internal posthog-reserved props such as
`$current_url` and `$screen_name` are not user payloads and are not scrubbed.

For full scrubber details — denylist keys, content patterns (email, IPv4/v6, JWT, bearer tokens,
Luhn-checked credit cards), idempotency, and `ScrubOptions` — see
`packages/analytics-types/README.md`.

## React Hooks

```tsx
import { AnalyticsProvider } from '@t/analytics-browser/react/AnalyticsProvider'
import { useAnalytics } from '@t/analytics-browser/react/useAnalytics'
import { useIdentify } from '@t/analytics-browser/react/useIdentify'
import { usePageView } from '@t/analytics-browser/react/usePageView'

export default function RootLayout({ children }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}

function Component() {
  const analytics = useAnalytics()
  useIdentify('user_123', { name: 'Jane Doe' })  // email auto-scrubbed if present
  usePageView()
  return <button onClick={() => analytics.capture('clicked', 'user_123', { id: 'cta' })}>Go</button>
}
```

## Clerk Integration

```tsx
import { ClerkAnalyticsBridge } from '@t/analytics-browser/react/ClerkAnalyticsBridge'

function App() {
  return (
    <>
      <ClerkAnalyticsBridge />
      {/* rest of app */}
    </>
  )
}
```
