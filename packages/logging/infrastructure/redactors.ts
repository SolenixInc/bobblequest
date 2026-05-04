/**
 * @fileoverview Redaction config + winston format that masks sensitive keys.
 */

import winston from 'winston'

export const DEFAULT_REDACT_PATHS: readonly string[] = [
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

export const REDACTION_CENSOR = '[REDACTED]'

export interface RedactConfig {
  paths: string[]
  censor: string
}

export function buildRedactConfig(extraPaths: readonly string[] = []): RedactConfig {
  const seen = new Set<string>()
  const paths: string[] = []
  for (const p of [...DEFAULT_REDACT_PATHS, ...extraPaths]) {
    if (!seen.has(p)) {
      seen.add(p)
      paths.push(p)
    }
  }
  return { paths, censor: REDACTION_CENSOR }
}

/** Winston format that recursively redacts any key whose name is in `paths`. */
export function redactFormat(config: RedactConfig = buildRedactConfig()): winston.Logform.Format {
  const pathSet = new Set(config.paths)
  const censor = config.censor

  const redact = (value: unknown): unknown => {
    if (value === null || value === undefined) return value
    if (Array.isArray(value)) return value.map(redact)
    if (typeof value !== 'object') return value

    // Error instances have non-enumerable `message`/`stack` that get lost via
    // Object.entries. Pass them through — winston's format.errors({ stack: true })
    // downstream extracts their fields correctly.
    if (value instanceof Error) return value

    const source = value as Record<string | symbol, unknown>
    const out: Record<string | symbol, unknown> = {}

    // String-keyed props: redact if key matches, otherwise recurse.
    for (const [k, v] of Object.entries(source)) {
      out[k] = pathSet.has(k) ? censor : redact(v)
    }

    // Symbol-keyed props: copy through verbatim — winston's LEVEL/SPLAT/MESSAGE
    // symbols (from triple-beam) must survive this format to reach transports.
    for (const sym of Object.getOwnPropertySymbols(source)) {
      out[sym] = source[sym]
    }

    return out
  }

  return winston.format((info) => redact(info) as winston.Logform.TransformableInfo)()
}
