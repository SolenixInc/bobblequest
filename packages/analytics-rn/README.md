# @t/analytics-rn

React Native `AnalyticsTracker` implementation backed by
[`posthog-react-native@4.43.5`](https://posthog.com/docs/libraries/react-native). Implements the
port from `@t/analytics-types`, scrubs every user-controlled payload through the shared PII
scrubber, and registers under the same DI token as the server and browser adapters so consumers
resolve uniformly across environments.

## Install

This is a workspace package in the template-repo monorepo:

```sh
bun add @t/analytics-rn
```

The host RN / Expo app must satisfy the `posthog-react-native` peer plus the React Native runtime
peers listed in `package.json`.

## Features

- Implements the `AnalyticsTracker` port from `@t/analytics-types`.
- React Native–optimised PostHog integration via `posthog-react-native`.
- PII scrubbing at the port boundary using the shared scrubber from `@t/analytics-types` — identical
  to the browser adapter (single source of truth).
- React hooks (`useAnalytics`, `useIdentify`, `useScreen`).
- Awilix DI registrar binding to `dependencyKeys.global.ANALYTICS`.
- NoOp fallback for missing `POSTHOG_API_KEY`.

## Dependency Injection

```ts
import { createContainer } from 'awilix'
import { registerAnalyticsRnDI } from '@t/analytics-rn'
import { dependencyKeys } from '@t/dependency-injection'

const container = createContainer()

registerAnalyticsRnDI(container, {
  config,                 // RnConfigAccessor: { get(key): string | undefined }
  environment: 'production', // optional — 'production' | 'local' | 'development' | 'testing'
  noOp: false,            // optional — force NoOp regardless of config
  pii: {                  // optional — forwarded to PostHogRnAnalyticsTracker
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
| `POSTHOG_API_KEY` | PostHog project API key. Missing key → `NoOpAnalyticsTracker` + console warning. |
| `POSTHOG_HOST` | Optional ingestion host. Defaults to `https://us.i.posthog.com`. |

Selection order (first match wins):

1. `options.noOp === true` → `NoOpAnalyticsTracker`
2. `!config.get('POSTHOG_API_KEY')` → `NoOpAnalyticsTracker` + warn
3. otherwise → `PostHogRnAnalyticsTracker`

The tracker is registered as a singleton under `dependencyKeys.global.ANALYTICS` — the same token
used by the server `registerAnalyticsDI` and the browser `registerAnalyticsBrowserDI`.

## Direct Construction

If you need to instantiate the tracker outside DI (tests, ad-hoc tooling):

```ts
import { PostHogRnAnalyticsTracker } from '@t/analytics-rn'
import type { ScrubOptions } from '@t/analytics-types'

const tracker = new PostHogRnAnalyticsTracker({
  environment: 'production',
  service: 'mobile',
  apiKey: process.env.POSTHOG_API_KEY!,
  host: process.env.POSTHOG_HOST,
  enabled: true,
  pii: { extraKeys: ['internalUserRef'] } satisfies ScrubOptions,
})
```

## Boot Gate — `await posthog.ready`

`posthog-react-native` performs an async storage bootstrap on construction. The
`PostHogRnAnalyticsTracker` constructor itself is synchronous, but the underlying SDK exposes a
`posthog.ready` promise. Await it at app startup before the first `capture` to avoid dropping events
queued during bootstrap:

```ts
const tracker = container.resolve(dependencyKeys.global.ANALYTICS) as PostHogRnAnalyticsTracker
await tracker.posthog.ready
tracker.capture('app_ready', 'anon')
```

## PII Scrubber Wiring

Behaviour is identical to the browser adapter — there is one scrubber implementation in
`@t/analytics-types` and both adapters call it the same way at the same port-method seams:

| Method | Scrubber call |
| --- | --- |
| `capture` | `scrubPiiFromProperties(properties, pii)` |
| `captureException` | flattens `error.message` / `error.name` / `error.stack` into the bag, then `scrubPiiFromProperties` over the merged bag |
| `identify` | `scrubPiiFromTraits(traits, pii)` |
| `group` | `scrubPiiFromTraits(traits, pii)` |
| `captureRevenue` | `scrubPiiFromProperties(event.meta, pii)` |
| `captureLlm` | `scrubPiiFromProperties(event.meta, pii)` |
| `captureScreen` | `scrubPiiFromProperties(properties, pii)` (RN-specific; calls `posthog.screen()`) |

Reserved PostHog super-props (`$environment`, `$service`, `$session_id`, `distinct_id`,
`request_id`, `$group`) pass through untouched.

For full scrubber details — denylist keys, content patterns (email, IPv4/v6, JWT, bearer tokens,
Luhn-checked credit cards), idempotency, and `ScrubOptions` — see
`packages/analytics-types/README.md`.

## Optional Peer Dependencies

`posthog-react-native` will use the following Expo / RN modules opportunistically when present in
the host app for richer auto-context (device, locale, persistent storage). They are declared as
optional peers — install only the ones you need:

- `expo-file-system`
- `expo-application`
- `expo-device`
- `expo-localization`
- `@react-native-async-storage/async-storage`

`@clerk/clerk-expo` is also listed as an optional peer for identity bridging.

## React Hooks

```tsx
import { useAnalytics } from '@t/analytics-rn'
import { useIdentify } from '@t/analytics-rn'
import { useScreen } from '@t/analytics-rn'

function Screen() {
  const analytics = useAnalytics()
  useIdentify('user_123', { name: 'Jane Doe' })
  useScreen('Home')
  return null
}
```
