/**
 * open-url — cross-platform browser/URL opener for the stack launcher.
 *
 * openUrl(url)         — open a single URL with the OS default handler.
 * openSurfaces(opts)  — iterate configured surfaces, apply --open allowlist,
 *                        stagger by 200 ms between opens, log per-surface result.
 *
 * Platform detection is the ONLY cross-platform seam — all platform-specific
 * code lives in this file. Callers are platform-agnostic.
 *
 * CI guard: when the CI environment variable is set the entire open phase is
 * skipped (opening a browser inside a headless runner makes no sense and would
 * hang on some platforms).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Named surfaces the launcher can open. */
export type SurfaceName = 'website' | 'web' | 'api' | 'mobile' | 'desktop'

export type SurfaceConfig = {
  name: SurfaceName
  /** URL to open in the browser. Undefined only for desktop (window, not URL). */
  url?: string
  /** Human-readable label used in log output. */
  label: string
}

export type OpenResult = {
  surface: SurfaceName
  ok: boolean
  /** Present when ok is false or when the surface was skipped. */
  message?: string
}

export type OpenSurfacesOptions = {
  /** Surfaces to open. Defaults to all five. Pass a subset for --open= flag. */
  allowlist?: SurfaceName[]
  /**
   * Injectable spawn function. Defaults to Bun.spawn.
   * Injected in tests to avoid real OS calls.
   */
  spawnFn?: (
    cmd: string[],
    opts: { stderr: 'pipe' },
  ) => {
    stderr: ReadableStream<Uint8Array> | null
    exited: Promise<number | null>
  }
  /**
   * Injectable PID reader for the desktop surface.
   * Defaults to reading `.stack/pids/desktop.pid` from the repo root.
   */
  readDesktopPid?: () => number | null
  /**
   * Injectable stagger delay (ms). Defaults to 200.
   * Set to 0 in tests to keep suite fast.
   */
  staggerMs?: number
}

// ---------------------------------------------------------------------------
// Surface registry
// ---------------------------------------------------------------------------

/**
 * All developer-facing surfaces in open order.
 *
 * API docs: no OpenAPI/Swagger UI or tRPC panel is mounted in apps/api.
 * The API's only human-reachable page is /bootstrap.
 * Follow-up: mount a tRPC panel at /panel to give this surface a proper UI.
 */
export const SURFACES: SurfaceConfig[] = [
  {
    name: 'website',
    url: 'http://localhost:3002',
    label: 'Marketing website (http://localhost:3002)',
  },
  {
    name: 'web',
    url: 'http://localhost:3001',
    label: 'Web app (http://localhost:3001)',
  },
  {
    name: 'api',
    // NOTE: No OpenAPI/Swagger or tRPC panel mounted. /bootstrap is the only
    // human-reachable API page. A proper doc UI is a follow-up (see ADR gap).
    url: 'http://localhost:3000/bootstrap',
    label: 'API bootstrap (http://localhost:3000/bootstrap)',
  },
  {
    name: 'mobile',
    url: 'http://localhost:8081',
    label: 'Metro bundler / Expo Go QR (http://localhost:8081)',
  },
  {
    name: 'desktop',
    // No URL — desktop spawns its own Electron window.
    label: 'Desktop (Electron window)',
  },
]

// ---------------------------------------------------------------------------
// Platform-aware open command
// ---------------------------------------------------------------------------

/**
 * Returns the OS-level command to open a URL.
 *
 * Windows : ['start', '', url]
 * macOS   : ['open', url]
 * Linux   : ['xdg-open', url]
 */
export function openCommand(url: string): string[] {
  switch (process.platform) {
    case 'win32':
      // `start ""` — the empty string is the window title; required so the URL
      // is not interpreted as the title when it contains special characters.
      return ['cmd', '/c', 'start', '', url]
    case 'darwin':
      return ['open', url]
    default:
      return ['xdg-open', url]
  }
}

// ---------------------------------------------------------------------------
// Core opener
// ---------------------------------------------------------------------------

/**
 * Open a single URL using the OS default handler.
 *
 * Failures are surfaced as a rejected Promise with the URL in the message
 * so the caller can log a warning and continue (best-effort).
 */
export async function openUrl(
  url: string,
  spawnFn: (
    cmd: string[],
    opts: { stderr: 'pipe' },
  ) => {
    stderr: ReadableStream<Uint8Array> | null
    exited: Promise<number | null>
  } = (cmd, opts) => Bun.spawn(cmd, opts),
): Promise<void> {
  const cmd = openCommand(url)
  const proc = spawnFn(cmd, { stderr: 'pipe' })

  const exitCode = await proc.exited

  if (exitCode !== 0 && exitCode !== null) {
    let stderrText = ''
    if (proc.stderr) {
      stderrText = await new Response(proc.stderr).text()
    }
    throw new Error(
      `openUrl failed for ${url} — exit code ${exitCode}${stderrText ? `: ${stderrText.trim()}` : ''}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Desktop PID liveness check
// ---------------------------------------------------------------------------

/**
 * Read the desktop PID from `.stack/pids/desktop.pid` relative to the repo
 * root. Returns null when the file is missing or unparseable.
 */
export function readDesktopPidFromFile(): number | null {
  // Lazy import to keep this module free of circular deps at the top level.
  try {
    const { existsSync, readFileSync } = require('node:fs') as typeof import('node:fs')
    const { fileURLToPath } = require('node:url') as typeof import('node:url')
    const { join } = require('node:path') as typeof import('node:path')

    const repoRoot = fileURLToPath(new URL('../..', import.meta.url)).replace(/[/]$/, '')
    const pidPath = join(repoRoot, '.stack', 'pids', 'desktop.pid')
    if (!existsSync(pidPath)) return null

    const raw = readFileSync(pidPath, 'utf8').trim()
    const pid = Number(raw)
    return Number.isFinite(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

/**
 * Check whether a PID is alive using signal 0 (cross-platform existence check).
 */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// ANSI helpers (minimal — launch.ts owns the full set)
// ---------------------------------------------------------------------------

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

// ---------------------------------------------------------------------------
// Stagger helper
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// openSurfaces — Phase 5.5 entry point
// ---------------------------------------------------------------------------

/**
 * Open all (or a subset of) developer-facing surfaces.
 *
 * - Skips entirely when process.env.CI is set (headless guard).
 * - Iterates surfaces sequentially with `staggerMs` delay (default 200 ms).
 * - Desktop: checks PID liveness instead of opening a URL.
 * - Failures are non-fatal — logs a warning and continues to the next surface.
 *
 * Returns an array of per-surface results (useful in tests).
 */
export async function openSurfaces(opts: OpenSurfacesOptions = {}): Promise<OpenResult[]> {
  // CI guard — never open browsers in a headless runner.
  if (process.env.CI) {
    console.log(`${DIM}[stack]${RESET} Phase 5.5 — skipped (CI environment detected)`)
    return []
  }

  const { allowlist, spawnFn, readDesktopPid = readDesktopPidFromFile, staggerMs = 200 } = opts

  const surfaces = allowlist ? SURFACES.filter((s) => allowlist.includes(s.name)) : SURFACES

  console.log(`\n\x1b[1mPhase 5.5 — Opening surfaces\x1b[0m`)

  const results: OpenResult[] = []

  for (let i = 0; i < surfaces.length; i++) {
    const surface = surfaces[i]

    if (i > 0 && staggerMs > 0) {
      await delay(staggerMs)
    }

    if (surface.name === 'desktop') {
      // Desktop surface: check PID liveness — no URL to open.
      const pid = readDesktopPid()
      if (pid === null) {
        console.log(`${YELLOW}⚠${RESET}  desktop — no PID file found (window may not have spawned)`)
        results.push({ surface: 'desktop', ok: false, message: 'no PID file found' })
      } else if (isPidAlive(pid)) {
        console.log(`${GREEN}✔${RESET} desktop — Desktop window opened (PID ${pid})`)
        results.push({ surface: 'desktop', ok: true })
      } else {
        console.log(
          `${YELLOW}⚠${RESET}  desktop — Desktop window failed to spawn (PID ${pid} is not alive)`,
        )
        results.push({
          surface: 'desktop',
          ok: false,
          message: `PID ${pid} is not alive`,
        })
      }
      continue
    }

    // URL surface
    const url = surface.url as string
    try {
      await openUrl(url, spawnFn)
      console.log(`${GREEN}✔${RESET} ${surface.name} (${url})`)
      results.push({ surface: surface.name, ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`${YELLOW}⚠${RESET}  ${surface.name} (${url} — ${msg})`)
      results.push({ surface: surface.name, ok: false, message: msg })
    }
  }

  return results
}
