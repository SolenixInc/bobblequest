/**
 * @fileoverview Test helpers for capturing winston JSON output and toggling
 * the NODE_ENV so the Console transport emits JSON to stdout.
 *
 * Winston's Console transport writes to `console._stdout` which Node.js
 * aliases to `process.stdout`. We spy on `process.stdout.write` to capture
 * the JSON-serialized log lines.
 */

import process from 'node:process'
import { vi } from 'vitest'

export interface CapturedStdout {
  lines: Record<string, unknown>[]
  raw: string[]
  restore: () => void
}

/**
 * Spy on the stream that winston's Console transport writes to.
 *
 * Winston's Console transport (see `winston/lib/winston/transports/console.js`)
 * resolves its target as `console._stdout` when present, falling back to
 * `console.log`. Under Node at the REPL, `console._stdout === process.stdout`;
 * under vitest's tinypool workers, `console._stdout` is REPLACED with a
 * worker-local writable so that test output is captured by the pool. That
 * means spying on `process.stdout.write` sees nothing — we must spy on
 * whatever winston actually writes to.
 *
 * Each chunk is split on newlines; any segment that parses as JSON is
 * appended to `lines`. Non-JSON fragments (stray ANSI or unrelated writes)
 * are silently dropped but retained under `raw` for debugging.
 */
export function captureStdout(): CapturedStdout {
  const lines: Record<string, unknown>[] = []
  const raw: string[] = []
  const c = console as unknown as { _stdout?: NodeJS.WritableStream }
  const target: NodeJS.WritableStream =
    (c._stdout as NodeJS.WritableStream | undefined) ?? process.stdout

  const spy = vi
    .spyOn(target, 'write')
    .mockImplementation((chunk: unknown, ...rest: unknown[]): boolean => {
      void rest
      const str =
        typeof chunk === 'string'
          ? chunk
          : chunk instanceof Uint8Array
            ? Buffer.from(chunk).toString('utf8')
            : String(chunk)
      raw.push(str)
      for (const piece of str.split('\n')) {
        const trimmed = piece.trim()
        if (trimmed.length === 0) continue
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed && typeof parsed === 'object') {
            lines.push(parsed as Record<string, unknown>)
          }
        } catch {
          // not our JSON — ignore
        }
      }
      return true
    })

  return {
    lines,
    raw,
    restore: () => spy.mockRestore(),
  }
}

interface SavedEnv {
  NODE_ENV: string | undefined
  ENVIRONMENT: string | undefined
  LOG_LEVEL: string | undefined
  POSTHOG_API_KEY: string | undefined
  SERVICE_NAME: string | undefined
}

/**
 * Force the logger into non-local (production-style JSON) output mode and
 * ensure the OTLP transport factory returns null so tests don't spin up
 * network timers. Returns a `restore` fn that fully reverts the env.
 */
export function setProductionEnv(
  overrides: Partial<Record<keyof SavedEnv, string | undefined>> = {},
): {
  restore: () => void
} {
  const saved: SavedEnv = {
    NODE_ENV: process.env.NODE_ENV,
    ENVIRONMENT: process.env.ENVIRONMENT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
    SERVICE_NAME: process.env.SERVICE_NAME,
  }

  // Non-local JSON Console transport path.
  process.env.NODE_ENV = overrides.NODE_ENV ?? 'production'
  // `ENVIRONMENT=testing` ALSO disables the OTLP transport in transportFactory,
  // which keeps tests hermetic even if POSTHOG_API_KEY leaks in from the host.
  process.env.ENVIRONMENT = overrides.ENVIRONMENT ?? 'testing'
  if ('LOG_LEVEL' in overrides) {
    if (overrides.LOG_LEVEL === undefined) process.env.LOG_LEVEL = undefined
    else process.env.LOG_LEVEL = overrides.LOG_LEVEL
  } else {
    process.env.LOG_LEVEL = 'debug'
  }
  if ('SERVICE_NAME' in overrides) {
    if (overrides.SERVICE_NAME === undefined) process.env.SERVICE_NAME = undefined
    else process.env.SERVICE_NAME = overrides.SERVICE_NAME
  }
  // Always unset POSTHOG_API_KEY unless explicitly set by the caller.
  if ('POSTHOG_API_KEY' in overrides && overrides.POSTHOG_API_KEY !== undefined) {
    process.env.POSTHOG_API_KEY = overrides.POSTHOG_API_KEY
  } else {
    process.env.POSTHOG_API_KEY = undefined
  }

  return {
    restore: () => {
      for (const key of Object.keys(saved) as (keyof SavedEnv)[]) {
        const val = saved[key]
        if (val === undefined) delete process.env[key]
        else process.env[key] = val
      }
    },
  }
}
