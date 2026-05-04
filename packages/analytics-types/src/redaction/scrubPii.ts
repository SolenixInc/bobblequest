/**
 * PII scrubber for the @t/analytics family. Placed in the shared types package
 * so every adapter (server posthog-node, browser posthog-js, RN posthog-react-native)
 * can import from @t/analytics-types without pulling in SDK-specific deps.
 */

import type { Event } from '../schemas/EventSchema.ts'
import { isReservedKey } from '../types/ReservedSuperProps.ts'

// ---------------------------------------------------------------------------
// Constants — mirrors DEFAULT_REDACT_PATHS from @t/logging/infrastructure/redactors.ts
// ---------------------------------------------------------------------------

export const DEFAULT_PII_KEYS: readonly string[] = [
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
  'phone',
  'phoneNumber',
  'phone_number',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
]

export const REDACTED_PLACEHOLDER = '[REDACTED]'

// ---------------------------------------------------------------------------
// Regex patterns — hoisted to module scope so they are compiled once
// ---------------------------------------------------------------------------

/** Simple email: local@domain.tld (not exhaustive by design, covers common cases) */
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/** IPv4 dotted-decimal */
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

/** IPv6 (full and compressed forms) */
const IPV6_RE =
  /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^::(?:[fF]{4}(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$|^(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

/** JWT: three base64url segments separated by dots */
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

/** High-entropy bearer/API token: >= 24 chars, only base64url/hex-safe chars */
const TOKEN_RE = /^[A-Za-z0-9_\-+/]{24,}$/

/** Digits-only string that could be a PAN (13–19 digits, common card lengths) */
const CC_DIGITS_RE = /^\d{13,19}$/

// ---------------------------------------------------------------------------
// Luhn check
// ---------------------------------------------------------------------------

function passesLuhn(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    // charCodeAt is always defined for valid indices; subtract char code for '0'
    let n = digits.charCodeAt(i) - 48
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

// ---------------------------------------------------------------------------
// Pattern names for skipPatterns option
// ---------------------------------------------------------------------------

export type PiiPattern = 'email' | 'ip' | 'jwt' | 'token' | 'creditCard'

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ScrubOptions {
  /** Additional key names to redact (merged with DEFAULT_PII_KEYS). */
  extraKeys?: string[]
  /** Key names to skip redaction for (takes precedence over extraKeys + defaults). */
  allowKeys?: string[]
  /** Override the redaction placeholder (default: '[REDACTED]'). */
  replaceWith?: string
  /** Disable specific content-pattern checks. */
  skipPatterns?: PiiPattern[]
}

// ---------------------------------------------------------------------------
// Core scrubber
// ---------------------------------------------------------------------------

/**
 * Recursively walks `properties` and redacts:
 * 1. Any string value whose key matches DEFAULT_PII_KEYS (+ extraKeys)
 * 2. Any string value whose content matches a built-in pattern
 *
 * Reserved super-prop keys ($environment, $service, etc.) are always passed
 * through unchanged.
 *
 * Numbers, booleans, and null are left untouched.
 */
export function scrubPiiFromProperties(
  properties: Record<string, unknown>,
  options?: ScrubOptions,
): Record<string, unknown> {
  const denySet = buildDenySet(options)
  const allowSet = new Set(options?.allowKeys ?? [])
  const placeholder = options?.replaceWith ?? REDACTED_PLACEHOLDER
  const skipPatterns = new Set<PiiPattern>(options?.skipPatterns ?? [])

  return walk(properties, denySet, allowSet, placeholder, skipPatterns) as Record<string, unknown>
}

/**
 * Thin wrapper for identify/group traits. Semantically the same scrub logic,
 * named distinctly for call-site clarity.
 */
export function scrubPiiFromTraits(
  traits: Record<string, unknown>,
  options?: ScrubOptions,
): Record<string, unknown> {
  return scrubPiiFromProperties(traits, options)
}

/**
 * Scrubs PII from an Event's `properties`, leaving all top-level reserved
 * fields (distinctId, event name, timestamp, groups) untouched.
 */
export function scrubEvent(event: Event, options?: ScrubOptions): Event {
  return {
    ...event,
    properties: scrubPiiFromProperties(event.properties, options),
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildDenySet(options?: ScrubOptions): Set<string> {
  const keys = [...DEFAULT_PII_KEYS, ...(options?.extraKeys ?? [])]
  return new Set(keys)
}

function walk(
  value: unknown,
  denySet: Set<string>,
  allowSet: Set<string>,
  placeholder: string,
  skipPatterns: Set<PiiPattern>,
): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map((item) => walk(item, denySet, allowSet, placeholder, skipPatterns))
  }

  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(source)) {
    // Reserved super-props always pass through.
    if (isReservedKey(k)) {
      out[k] = v
      continue
    }

    // allowKeys override everything.
    if (allowSet.has(k)) {
      out[k] = v
      continue
    }

    // Key-based denylist.
    if (denySet.has(k) && typeof v === 'string') {
      out[k] = placeholder
      continue
    }

    // Content-based pattern checks (string values only).
    if (typeof v === 'string' && matchesAnyPattern(v, skipPatterns)) {
      out[k] = placeholder
      continue
    }

    // Recurse into nested objects.
    if (v !== null && typeof v === 'object') {
      out[k] = walk(v, denySet, allowSet, placeholder, skipPatterns)
      continue
    }

    out[k] = v
  }

  return out
}

function matchesAnyPattern(value: string, skipPatterns: Set<PiiPattern>): boolean {
  if (!skipPatterns.has('email') && EMAIL_RE.test(value)) return true
  if (!skipPatterns.has('ip') && (IPV4_RE.test(value) || IPV6_RE.test(value))) return true
  if (!skipPatterns.has('jwt') && JWT_RE.test(value)) return true
  if (!skipPatterns.has('token') && TOKEN_RE.test(value)) return true
  if (!skipPatterns.has('creditCard') && CC_DIGITS_RE.test(value) && passesLuhn(value)) return true
  return false
}
