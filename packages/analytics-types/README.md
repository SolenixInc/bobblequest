# @t/analytics-types

Platform-neutral analytics port interfaces, entity types, the isomorphic `EventSchema`, and the
shared PII scrubber consumed by every adapter in the `@t/analytics-*` family.

## Why this package exists

`@t/analytics` depends on `posthog-node` and `winston`-backed logging — Node-only binaries.
Extracting the pure TypeScript port + types into this zero-runtime sibling lets
`@t/analytics-browser` (posthog-js), `@t/analytics-rn` (posthog-react-native), and any other
isomorphic consumer import the same `AnalyticsTracker` abstract class, `EventSchema`, supporting
types, and PII scrubber without pulling in server-only transitive deps.

## Contents

```text
src/
  ports/
    AnalyticsTracker.ts        — abstract class, 11 methods
    RequestAnalyticsTracker.ts — request-scoped wrapper port
  types/
    AnalyticsTrackerOptions.ts
    Environment.ts
    LlmEvent.ts
    ReservedSuperProps.ts      — const + isReservedKey predicate
    RevenueEvent.ts
    Service.ts
  schemas/
    EventSchema.ts             — zod schema (isomorphic, runtime)
  redaction/
    scrubPii.ts                — shared PII scrubber + options
```

## Dependencies

`zod ^3.23` only. No Node-specific binaries.

## Redaction (PII Scrubber)

A single PII scrubber lives in this package so every adapter — server (`posthog-node`), browser
(`posthog-js`), and React Native (`posthog-react-native`) — applies the same redaction at the port
boundary. Adapter authors do not roll their own.

### Public API

```ts
import {
  scrubPiiFromProperties,
  scrubPiiFromTraits,
  scrubEvent,
  DEFAULT_PII_KEYS,
  REDACTED_PLACEHOLDER,
  type ScrubOptions,
  type PiiPattern,
} from '@t/analytics-types'
```

| Export | Signature | Purpose |
| --- | --- | --- |
| `scrubPiiFromProperties` | `(props: Record<string, unknown>, options?: ScrubOptions) => Record<string, unknown>` | Recursively scrub a properties bag. The workhorse; every other entry point delegates here. |
| `scrubPiiFromTraits` | `(traits: Record<string, unknown>, options?: ScrubOptions) => Record<string, unknown>` | Thin wrapper over `scrubPiiFromProperties` named for `identify` / `group` call-sites. |
| `scrubEvent` | `(event: Event, options?: ScrubOptions) => Event` | Highest-level convenience — scrubs `event.properties` while leaving top-level reserved fields (`distinctId`, event name, timestamp, groups) untouched. |
| `DEFAULT_PII_KEYS` | `readonly string[]` | The default denylist (password, token, accessToken, refreshToken, apiKey, secret, authorization, cookie, email, phone, ssn, creditCard, cardNumber, cvv, etc.). |
| `REDACTED_PLACEHOLDER` | `'[REDACTED]'` | Default replacement string. |
| `ScrubOptions` | see below | Customisation knobs. |
| `PiiPattern` | `'email' \| 'ip' \| 'jwt' \| 'token' \| 'creditCard'` | Pattern names for `skipPatterns`. |

### ScrubOptions

```ts
interface ScrubOptions {
  /** Additional key names to redact (merged with DEFAULT_PII_KEYS). */
  extraKeys?: string[]
  /** Key names to skip redaction for (takes precedence over extraKeys + defaults). */
  allowKeys?: string[]
  /** Override the redaction placeholder (default: '[REDACTED]'). */
  replaceWith?: string
  /** Disable specific content-pattern checks. */
  skipPatterns?: PiiPattern[]
}
```

### Redaction classes covered

The scrubber redacts on two axes simultaneously:

1. **Denylist keys** — any string value whose key is in `DEFAULT_PII_KEYS` (or `extraKeys`) is
   replaced with the placeholder. `allowKeys` overrides both.
2. **Content patterns** — string values matching any of these patterns are replaced regardless of
   their key name:
   - `email` — `local@domain.tld`
   - `ip` — IPv4 dotted-decimal and IPv6 (full + compressed)
   - `jwt` — three base64url segments separated by dots
   - `token` — high-entropy bearer / API tokens (>= 24 chars, base64url / hex-safe)
   - `creditCard` — 13–19 digit strings that pass the Luhn check

Each content pattern can be individually disabled via `skipPatterns`.

### Reserved super-props are never scrubbed

The following PostHog reserved super-property keys always pass through untouched, regardless of
denylist / pattern matches:

- `$environment`
- `$service`
- `$session_id`
- `distinct_id`
- `request_id`
- `$group`

The `isReservedKey` predicate (also exported from this package) is the single source of truth for
this list.

### Idempotency guarantee

Scrubbing a scrubbed payload is a no-op. The placeholder `[REDACTED]` does not match any content
pattern and is not a denylisted key value, so calling `scrubPiiFromProperties` twice produces the
same result as calling it once. Adapters can therefore scrub defensively at the port boundary
without worrying about double-redaction artifacts.

### Usage example (adapter authors)

```ts
import {
  type AnalyticsTracker,
  scrubPiiFromProperties,
  type ScrubOptions,
} from '@t/analytics-types'

export class MyAdapter implements AnalyticsTracker {
  constructor(private readonly piiOptions?: ScrubOptions) {}

  capture(event: string, _distinctId: string, properties?: Record<string, unknown>): void {
    const safe = properties ? scrubPiiFromProperties(properties, this.piiOptions) : {}
    // forward `safe` to the underlying SDK …
  }
}
```

See `@t/analytics-browser` and `@t/analytics-rn` for the canonical wirings.
