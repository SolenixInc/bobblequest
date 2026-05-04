/**
 * @fileoverview Unit tests for the analytics PII scrubber.
 *
 * Covers: key-based denylist, content-pattern redaction (email, IP, JWT,
 * token, credit card), nested objects, arrays, allowKeys override,
 * custom replaceWith, skipPatterns, reserved-key passthrough, and
 * idempotency.
 */

import { describe, expect, test } from 'vitest'
import {
  DEFAULT_PII_KEYS,
  REDACTED_PLACEHOLDER,
  scrubEvent,
  scrubPiiFromProperties,
  scrubPiiFromTraits,
} from '../../src/redaction/scrubPii.ts'

const R = REDACTED_PLACEHOLDER // '[REDACTED]'

// ---------------------------------------------------------------------------
// DEFAULT_PII_KEYS export
// ---------------------------------------------------------------------------

describe('DEFAULT_PII_KEYS', () => {
  test('exports a non-empty readonly array', () => {
    expect(Array.isArray(DEFAULT_PII_KEYS)).toBe(true)
    expect(DEFAULT_PII_KEYS.length).toBeGreaterThan(0)
  })

  test('includes the same set as @t/logging DEFAULT_REDACT_PATHS', () => {
    const loggingDefaults = [
      'password',
      'passwd',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'Authorization',
      'cookie',
      'Cookie',
      'set-cookie',
      'email',
    ]
    for (const key of loggingDefaults) {
      expect(DEFAULT_PII_KEYS).toContain(key)
    }
  })
})

// ---------------------------------------------------------------------------
// Key-based redaction
// ---------------------------------------------------------------------------

describe('key-based denylist', () => {
  test('redacts password', () => {
    const result = scrubPiiFromProperties({ password: 'hunter2' })
    expect(result.password).toBe(R)
  })

  test('redacts email key', () => {
    const result = scrubPiiFromProperties({ email: 'user@example.com' })
    expect(result.email).toBe(R)
  })

  test('redacts accessToken', () => {
    const result = scrubPiiFromProperties({ accessToken: 'abc' })
    expect(result.accessToken).toBe(R)
  })

  test('redacts apiKey', () => {
    const result = scrubPiiFromProperties({ apiKey: 'sk-secret' })
    expect(result.apiKey).toBe(R)
  })

  test('redacts api_key', () => {
    const result = scrubPiiFromProperties({ api_key: 'sk-secret' })
    expect(result.api_key).toBe(R)
  })

  test('redacts secret', () => {
    const result = scrubPiiFromProperties({ secret: 'mysecret' })
    expect(result.secret).toBe(R)
  })

  test('redacts authorization', () => {
    const result = scrubPiiFromProperties({ authorization: 'Bearer xyz' })
    expect(result.authorization).toBe(R)
  })

  test('redacts Authorization (capitalized)', () => {
    const result = scrubPiiFromProperties({ Authorization: 'Bearer xyz' })
    expect(result.Authorization).toBe(R)
  })

  test('redacts cookie', () => {
    const result = scrubPiiFromProperties({ cookie: 'sid=abc' })
    expect(result.cookie).toBe(R)
  })

  test('leaves non-sensitive string keys unchanged', () => {
    const result = scrubPiiFromProperties({ plan: 'pro', userId: 'u1' })
    expect(result.plan).toBe('pro')
    expect(result.userId).toBe('u1')
  })

  test('does not redact non-string values even if key matches', () => {
    // A numeric "token" is not a credential string — leave it as-is
    // (key denylist only applies to string values)
    const result = scrubPiiFromProperties({ token: 42 })
    expect(result.token).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// Content-based patterns — email
// ---------------------------------------------------------------------------

describe('content pattern: email', () => {
  test('redacts value containing a plain email address', () => {
    const result = scrubPiiFromProperties({ customField: 'alice@example.com' })
    expect(result.customField).toBe(R)
  })

  test('does not redact non-email strings', () => {
    const result = scrubPiiFromProperties({ customField: 'hello world' })
    expect(result.customField).toBe('hello world')
  })
})

// ---------------------------------------------------------------------------
// Content-based patterns — IP
// ---------------------------------------------------------------------------

describe('content pattern: IP', () => {
  test('redacts IPv4 address', () => {
    const result = scrubPiiFromProperties({ ip: '192.168.1.1' })
    expect(result.ip).toBe(R)
  })

  test('redacts IPv6 address', () => {
    const result = scrubPiiFromProperties({ addr: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' })
    expect(result.addr).toBe(R)
  })

  test('does not redact plain strings', () => {
    const result = scrubPiiFromProperties({ label: 'server-1' })
    expect(result.label).toBe('server-1')
  })
})

// ---------------------------------------------------------------------------
// Content-based patterns — JWT
// ---------------------------------------------------------------------------

describe('content pattern: JWT', () => {
  test('redacts three-segment base64url string', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const result = scrubPiiFromProperties({ token_value: jwt })
    expect(result.token_value).toBe(R)
  })

  test('does not redact two-segment string', () => {
    const result = scrubPiiFromProperties({ val: 'abc.def' })
    expect(result.val).toBe('abc.def')
  })
})

// ---------------------------------------------------------------------------
// Content-based patterns — bearer/API token
// ---------------------------------------------------------------------------

describe('content pattern: high-entropy token', () => {
  test('redacts 24+ char alphanumeric string', () => {
    const result = scrubPiiFromProperties({ data: 'sk_live_ABCDEFGHIJKLMNOPQRSTUVWX' })
    expect(result.data).toBe(R)
  })

  test('does not redact short strings', () => {
    const result = scrubPiiFromProperties({ data: 'shortval' })
    expect(result.data).toBe('shortval')
  })
})

// ---------------------------------------------------------------------------
// Content-based patterns — credit card
// ---------------------------------------------------------------------------

describe('content pattern: credit card', () => {
  // Visa test PAN that passes Luhn
  test('redacts valid Visa-like PAN', () => {
    const result = scrubPiiFromProperties({ pan: '4532015112830366' })
    expect(result.pan).toBe(R)
  })

  test('does not redact digit string that fails Luhn', () => {
    const result = scrubPiiFromProperties({ val: '1234567890123456' })
    expect(result.val).toBe('1234567890123456')
  })

  test('does not redact digit strings shorter than 13 digits', () => {
    const result = scrubPiiFromProperties({ val: '123456789012' })
    expect(result.val).toBe('123456789012')
  })
})

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

describe('nested objects', () => {
  test('redacts password inside a nested object', () => {
    const result = scrubPiiFromProperties({ user: { name: 'alice', password: 'secret' } })
    const user = result.user as Record<string, unknown>
    expect(user.password).toBe(R)
    expect(user.name).toBe('alice')
  })

  test('redacts deeply nested keys', () => {
    const result = scrubPiiFromProperties({
      level1: { level2: { level3: { email: 'x@y.com', safe: 'ok' } } },
    })
    const l3 = (result.level1 as Record<string, unknown>).level2 as Record<
      string,
      Record<string, unknown>
    >
    expect(l3.level3.email).toBe(R)
    expect(l3.level3.safe).toBe('ok')
  })
})

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

describe('arrays', () => {
  test('scrubs PII inside objects within arrays', () => {
    const result = scrubPiiFromProperties({
      users: [
        { name: 'alice', email: 'alice@example.com' },
        { name: 'bob', email: 'bob@example.com' },
      ],
    })
    const users = result.users as Array<Record<string, unknown>>
    expect(users[0]!.email).toBe(R)
    expect(users[0]!.name).toBe('alice')
    expect(users[1]!.email).toBe(R)
    expect(users[1]!.name).toBe('bob')
  })

  test('passes through primitive arrays unchanged', () => {
    const result = scrubPiiFromProperties({ tags: ['frontend', 'billing'] })
    expect(result.tags).toEqual(['frontend', 'billing'])
  })
})

// ---------------------------------------------------------------------------
// Reserved super-prop passthrough
// ---------------------------------------------------------------------------

describe('reserved super-prop passthrough', () => {
  const reserved: Record<string, unknown> = {
    $environment: 'production',
    $service: 'api',
    $session_id: 'sess_abc',
    distinct_id: 'user_123',
    request_id: 'req_456',
    $group: 'org_789',
  }

  test('all six reserved keys pass through unchanged', () => {
    const result = scrubPiiFromProperties(reserved)
    for (const [k, v] of Object.entries(reserved)) {
      expect(result[k]).toBe(v)
    }
  })
})

// ---------------------------------------------------------------------------
// Options: extraKeys
// ---------------------------------------------------------------------------

describe('options.extraKeys', () => {
  test('redacts a custom key added via extraKeys', () => {
    const result = scrubPiiFromProperties(
      { internalSecret: 'val', safe: 'ok' },
      { extraKeys: ['internalSecret'] },
    )
    expect(result.internalSecret).toBe(R)
    expect(result.safe).toBe('ok')
  })
})

// ---------------------------------------------------------------------------
// Options: allowKeys
// ---------------------------------------------------------------------------

describe('options.allowKeys', () => {
  test('allowKeys overrides denylist for a key', () => {
    const result = scrubPiiFromProperties(
      { email: 'allowed@example.com', password: 'secret' },
      { allowKeys: ['email'] },
    )
    expect(result.email).toBe('allowed@example.com')
    expect(result.password).toBe(R)
  })

  test('allowKeys also suppresses content-pattern redaction', () => {
    // The value "alice@example.com" would normally be redacted by the email pattern.
    // Under allowKeys the field survives.
    const result = scrubPiiFromProperties(
      { debugEmail: 'alice@example.com' },
      { allowKeys: ['debugEmail'] },
    )
    expect(result.debugEmail).toBe('alice@example.com')
  })
})

// ---------------------------------------------------------------------------
// Options: replaceWith
// ---------------------------------------------------------------------------

describe('options.replaceWith', () => {
  test('uses custom placeholder', () => {
    const result = scrubPiiFromProperties({ password: 'secret' }, { replaceWith: '***' })
    expect(result.password).toBe('***')
  })
})

// ---------------------------------------------------------------------------
// Options: skipPatterns
// ---------------------------------------------------------------------------

describe('options.skipPatterns', () => {
  test('skip email pattern', () => {
    const result = scrubPiiFromProperties(
      { field: 'user@example.com' },
      { skipPatterns: ['email'] },
    )
    // The key 'field' is not in the denylist and the email pattern is skipped.
    expect(result.field).toBe('user@example.com')
  })

  test('skip ip pattern', () => {
    const result = scrubPiiFromProperties({ field: '10.0.0.1' }, { skipPatterns: ['ip'] })
    expect(result.field).toBe('10.0.0.1')
  })

  test('skip jwt pattern', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123'
    const result = scrubPiiFromProperties({ field: jwt }, { skipPatterns: ['jwt'] })
    expect(result.field).toBe(jwt)
  })

  test('skip creditCard pattern', () => {
    const result = scrubPiiFromProperties(
      { field: '4532015112830366' },
      { skipPatterns: ['creditCard'] },
    )
    expect(result.field).toBe('4532015112830366')
  })

  test('skip token pattern', () => {
    const result = scrubPiiFromProperties(
      { field: 'sk_live_ABCDEFGHIJKLMNOPQRSTUVWX' },
      { skipPatterns: ['token'] },
    )
    // No key match (field not in denylist) and token pattern skipped — passes through
    expect(result.field).toBe('sk_live_ABCDEFGHIJKLMNOPQRSTUVWX')
  })
})

// ---------------------------------------------------------------------------
// Null / undefined / boolean / number pass-through
// ---------------------------------------------------------------------------

describe('primitive pass-through', () => {
  test('null values are preserved', () => {
    const result = scrubPiiFromProperties({ field: null })
    expect(result.field).toBeNull()
  })

  test('boolean values are preserved', () => {
    const result = scrubPiiFromProperties({ active: true })
    expect(result.active).toBe(true)
  })

  test('number values are preserved', () => {
    const result = scrubPiiFromProperties({ count: 42 })
    expect(result.count).toBe(42)
  })

  test('undefined array elements are preserved', () => {
    // Forces the undefined branch of the walk function
    const result = scrubPiiFromProperties({ items: [undefined, 'hello'] })
    const items = result.items as unknown[]
    expect(items[0]).toBeUndefined()
    expect(items[1]).toBe('hello')
  })
})

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('idempotency', () => {
  test('scrubbing twice yields the same output as scrubbing once', () => {
    const input = {
      email: 'a@b.com',
      password: 'secret',
      safe: 'ok',
      nested: { token: 'abc', count: 5 },
    }
    const once = scrubPiiFromProperties(input)
    const twice = scrubPiiFromProperties(once as Record<string, unknown>)
    expect(twice).toEqual(once)
  })
})

// ---------------------------------------------------------------------------
// scrubPiiFromTraits
// ---------------------------------------------------------------------------

describe('scrubPiiFromTraits', () => {
  test('redacts PII in traits', () => {
    const result = scrubPiiFromTraits({ email: 'user@example.com', plan: 'pro' })
    expect(result.email).toBe(R)
    expect(result.plan).toBe('pro')
  })

  test('accepts options', () => {
    const result = scrubPiiFromTraits({ password: 'secret' }, { replaceWith: '***' })
    expect(result.password).toBe('***')
  })
})

// ---------------------------------------------------------------------------
// scrubEvent
// ---------------------------------------------------------------------------

describe('scrubEvent', () => {
  test('scrubs properties but preserves top-level event fields', () => {
    const event = {
      event: 'sign_up',
      distinctId: 'user_123',
      properties: { email: 'a@b.com', plan: 'pro' },
    }
    const result = scrubEvent(event)
    expect(result.event).toBe('sign_up')
    expect(result.distinctId).toBe('user_123')
    expect((result.properties as Record<string, unknown>).email).toBe(R)
    expect((result.properties as Record<string, unknown>).plan).toBe('pro')
  })

  test('preserves optional timestamp and groups', () => {
    const ts = new Date('2024-01-01')
    const event = {
      event: 'purchase',
      distinctId: 'u1',
      properties: { password: 'x' },
      groups: { org: 'acme' },
      timestamp: ts,
    }
    const result = scrubEvent(event)
    expect(result.timestamp).toBe(ts)
    expect(result.groups).toEqual({ org: 'acme' })
  })

  test('accepts scrub options', () => {
    const event = {
      event: 'e',
      distinctId: 'u1',
      properties: { email: 'a@b.com' },
    }
    const result = scrubEvent(event, { skipPatterns: ['email'] })
    expect((result.properties as Record<string, unknown>).email).toBe(R) // key-based
  })

  test('reserved super-props inside properties pass through', () => {
    const event = {
      event: 'e',
      distinctId: 'u1',
      properties: {
        $environment: 'production',
        password: 'secret',
      },
    }
    const result = scrubEvent(event)
    expect((result.properties as Record<string, unknown>).$environment).toBe('production')
    expect((result.properties as Record<string, unknown>).password).toBe(R)
  })
})
