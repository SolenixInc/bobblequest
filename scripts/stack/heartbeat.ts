/**
 * heartbeat.ts — elapsed-time status ticker for long-running async operations.
 *
 * Prints a one-line status every `intervalMs` while an async operation is in
 * progress. Call `stop()` in the finally block of your operation:
 *
 *   const stop = startHeartbeat({ label: 'Polling readiness endpoints' })
 *   try {
 *     await waitForReady(60_000)
 *   } finally {
 *     stop()
 *   }
 *
 * TTY behaviour:
 *   - TTY (interactive terminal): overwrites the current line via `\r` so the
 *     ticker stays in place without spamming scroll history.
 *   - Non-TTY (CI / piped output): emits one line per tick so the full history
 *     is preserved in logs.
 *
 * No external dependencies — uses stdlib only.
 */

// ---------------------------------------------------------------------------
// ANSI helpers (intentionally local — no import from launch.ts to keep this
// file self-contained and independently testable).
// ---------------------------------------------------------------------------

const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeartbeatOptions = {
  /** Human-readable label printed on every tick, e.g. "Polling readiness". */
  label: string
  /** How often to emit a tick, in milliseconds. Default: 5 000 ms. */
  intervalMs?: number
  /**
   * Optional custom tick handler. Receives elapsed milliseconds since
   * `startHeartbeat` was called. When provided, the default stdout writer is
   * skipped entirely — the caller is responsible for all output.
   */
  onTick?: (elapsedMs: number) => void
}

export type StopHeartbeat = () => void

// ---------------------------------------------------------------------------
// Default tick writer
// ---------------------------------------------------------------------------

/**
 * Writes a single heartbeat tick to stdout.
 *
 * On TTY: uses `\r` to overwrite the previous tick line (no scroll spam).
 * On non-TTY (CI): writes a newline-terminated line so the full history lands
 * in the log file.
 */
function writeTickToStdout(label: string, elapsedMs: number): void {
  const elapsedSec = (elapsedMs / 1_000).toFixed(1)
  const line = `${DIM}... ${label} (${elapsedSec}s)${RESET}`

  if (process.stdout.isTTY) {
    // Overwrite the current terminal line. Pad with spaces to clear leftovers
    // from a longer previous line. 80 chars is a safe minimum for most terminals.
    const padded = line.padEnd(80)
    process.stdout.write(`\r${padded}`)
  } else {
    process.stdout.write(`${line}\n`)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts a heartbeat ticker that fires every `intervalMs` milliseconds.
 *
 * Returns a `stop` function. Always call `stop()` — even on success — to
 * cancel the interval and (on TTY) clear the ticker line before the next
 * log output.
 */
export function startHeartbeat(opts: HeartbeatOptions): StopHeartbeat {
  const intervalMs = opts.intervalMs ?? 5_000
  const startedAt = Date.now()

  const handle = setInterval(() => {
    const elapsedMs = Date.now() - startedAt
    if (opts.onTick) {
      opts.onTick(elapsedMs)
    } else {
      writeTickToStdout(opts.label, elapsedMs)
    }
  }, intervalMs)

  return function stop(): void {
    clearInterval(handle)
    // On TTY, clear the ticker line so the next log.ok / log.warn lands cleanly
    // on a fresh line instead of overwriting the dimmed spinner text.
    if (!opts.onTick && process.stdout.isTTY) {
      process.stdout.write(`\r${' '.repeat(82)}\r`)
    }
  }
}
