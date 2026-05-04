/**
 * Health polling helper.
 *
 * Wraps the existing probe-http utility with a deadline-based loop so callers
 * can write:
 *
 *   const ok = await pollUntilReady('http://localhost:3000/bootstrap', { timeoutMs: 60_000 })
 *
 * Re-exports `probe` so callers that need raw probe control can import from here.
 */

import { probe } from '../doctor/probe-http.ts'

export { probe }

export type PollOptions = {
  /** Total time to wait before giving up (default: 60 000 ms) */
  timeoutMs?: number
  /** How long between poll attempts (default: 1 000 ms) */
  intervalMs?: number
  /** Per-request timeout (default: 5 000 ms) */
  requestTimeoutMs?: number
}

/**
 * Called on each poll attempt. Receives:
 *   - `url`       the endpoint being polled
 *   - `ok`        whether this attempt returned a 2xx
 *   - `elapsedMs` milliseconds since polling started
 */
export type PollTickCallback = (url: string, ok: boolean, elapsedMs: number) => void

/**
 * Polls `url` every `intervalMs` until a 2xx response is received or
 * `timeoutMs` elapses.
 *
 * Returns `true` on first 2xx; `false` on timeout.
 */
export async function pollUntilReady(url: string, opts: PollOptions = {}): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 60_000
  const intervalMs = opts.intervalMs ?? 1_000
  const requestTimeoutMs = opts.requestTimeoutMs ?? 5_000

  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const result = await probe(url, { timeoutMs: requestTimeoutMs })
    if (result.ok) return true
    if (Date.now() + intervalMs >= deadline) break
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}

/**
 * Like `pollUntilReady`, but invokes `onTick` after every probe attempt so
 * callers can report progress in real time.
 *
 * The exported `pollUntilReady` signature is unchanged — this is an additive
 * variant used by `waitForReadyWithProgress` in launch.ts.
 */
export async function pollUntilReadyWithProgress(
  url: string,
  opts: PollOptions,
  onTick: PollTickCallback,
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 60_000
  const intervalMs = opts.intervalMs ?? 1_000
  const requestTimeoutMs = opts.requestTimeoutMs ?? 5_000

  const startedAt = Date.now()
  const deadline = startedAt + timeoutMs

  while (Date.now() < deadline) {
    const result = await probe(url, { timeoutMs: requestTimeoutMs })
    const elapsed = Date.now() - startedAt
    onTick(url, result.ok, elapsed)
    if (result.ok) return true
    if (Date.now() + intervalMs >= deadline) break
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}
