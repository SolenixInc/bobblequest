/**
 * HTTP probe helper.
 *
 * Uses Bun's built-in fetch + AbortSignal.timeout — no extra deps.
 * Polls a URL until it returns 200 (or any 2xx) or all retries are exhausted.
 */

export type ProbeOptions = {
  /** Per-attempt timeout in milliseconds (default: 5000) */
  timeoutMs?: number
  /** Total number of attempts (default: 1; set > 1 for polling) */
  retries?: number
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number
}

export type ProbeResult = {
  ok: boolean
  status?: number
  body?: unknown
  error?: string
  latencyMs: number
}

/**
 * Fetches `url` up to `retries` times, each with its own `timeoutMs` budget.
 * Returns the first successful (2xx) result, or the last failure.
 */
export async function probe(url: string, opts: ProbeOptions = {}): Promise<ProbeResult> {
  const timeoutMs = opts.timeoutMs ?? 5_000
  const retries = opts.retries ?? 1
  const retryDelayMs = opts.retryDelayMs ?? 1_000

  let lastResult: ProbeResult = {
    ok: false,
    error: 'no attempts made',
    latencyMs: 0,
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await delay(retryDelayMs)
    }

    const start = performance.now()
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      const latencyMs = Math.round(performance.now() - start)

      let body: unknown
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        try {
          body = await res.json()
        } catch {
          body = await res.text()
        }
      } else {
        body = await res.text()
      }

      lastResult = {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        body,
        latencyMs,
      }

      if (lastResult.ok) return lastResult
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start)
      const message = err instanceof Error ? err.message : String(err)
      lastResult = { ok: false, error: message, latencyMs }
    }
  }

  return lastResult
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
