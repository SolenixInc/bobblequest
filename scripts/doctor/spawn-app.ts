/**
 * App spawner for the doctor live-boot phase.
 *
 * Uses Bun.spawn to start a dev server, detects readiness via:
 *   - stdout/stderr log-line matching (readyMatcher per AppEntry kind)
 *   - HTTP polling (probeUrl) for HTTP-serving apps
 *
 * Returns a handle with { proc, ready, stop }.
 */

import type { AppEntry } from './apps.ts'
import { probe } from './probe-http.ts'

// Default ready matchers per app kind
const KIND_MATCHERS: Record<AppEntry['kind'], RegExp> = {
  next: /Ready in|ready on|started server|Local:\s+http/i,
  hono: /Listening|listening|started|Server running|http:\/\/localhost/i,
  expo: /Metro waiting on|Metro Bundler ready|Expo DevTools/i,
  electron: /App is ready|ready|electron.*start/i,
}

export type AppHandle = {
  proc: ReturnType<typeof Bun.spawn>
  ready: Promise<void>
  stop: () => Promise<void>
}

/**
 * Boot an app and return a handle.
 *
 * @param entry  App registry entry
 * @param repoRoot  Absolute path to the monorepo root
 * @param timeoutMs  Max ms to wait for readiness (default: 60 000)
 */
export function bootApp(entry: AppEntry, repoRoot: string, timeoutMs = 60_000): AppHandle {
  const cwd =
    entry.cwd.startsWith('/') || /^[A-Za-z]:/.test(entry.cwd)
      ? entry.cwd
      : `${repoRoot}/${entry.cwd}`

  const matcher = entry.readyMatcher ?? KIND_MATCHERS[entry.kind]

  const proc = Bun.spawn(entry.devCommand, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
  })

  // Drain both streams — we pipe them to detect readiness
  const lines: string[] = []
  let resolveReady!: () => void
  let rejectReady!: (err: Error) => void

  const ready = new Promise<void>((res, rej) => {
    resolveReady = res
    rejectReady = rej
  })

  let resolved = false

  async function drainStream(stream: ReadableStream<Uint8Array> | null): Promise<void> {
    if (!stream) return
    const decoder = new TextDecoder()
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const chunkLines = chunk.split(/\r?\n/)
        for (const line of chunkLines) {
          lines.push(line)
          if (!resolved && matcher.test(line)) {
            resolved = true
            resolveReady()
          }
        }
      }
    } catch {
      // stream closed on kill — normal
    } finally {
      reader.releaseLock()
    }
  }

  // If the app has a probe URL, also poll HTTP for readiness
  async function pollHttp(): Promise<void> {
    if (!entry.probeUrl || resolved) return
    const pollInterval = 1_000
    const maxAttempts = Math.ceil(timeoutMs / pollInterval)
    for (let i = 0; i < maxAttempts; i++) {
      if (resolved) return
      await new Promise<void>((r) => setTimeout(r, pollInterval))
      const probeUrl = entry.probeUrl as string
      const result = await probe(probeUrl, { timeoutMs: 3_000 })
      if (result.ok && !resolved) {
        resolved = true
        resolveReady()
        return
      }
    }
  }

  // Overall timeout
  const timeoutId = setTimeout(() => {
    if (!resolved) {
      resolved = true
      rejectReady(
        new Error(
          `App "${entry.name}" did not become ready within ${timeoutMs}ms.\nLast output:\n${lines.slice(-10).join('\n')}`,
        ),
      )
    }
  }, timeoutMs)

  // Start all readiness strategies concurrently
  Promise.all([drainStream(proc.stdout), drainStream(proc.stderr), pollHttp()]).then(() => {
    clearTimeout(timeoutId)
  })

  // Clear timeout when resolved (either way)
  ready.then(
    () => clearTimeout(timeoutId),
    () => clearTimeout(timeoutId),
  )

  async function stop(): Promise<void> {
    if (proc.exitCode !== null) return // already dead

    try {
      proc.kill('SIGTERM')
    } catch {
      // Already gone
    }

    // Give it 5s grace period before force-killing
    const graceMs = 5_000
    const deadline = Date.now() + graceMs

    while (Date.now() < deadline) {
      if (proc.exitCode !== null) return
      await new Promise<void>((r) => setTimeout(r, 200))
    }

    try {
      proc.kill('SIGKILL')
    } catch {
      // Already dead
    }
  }

  return { proc, ready, stop }
}
