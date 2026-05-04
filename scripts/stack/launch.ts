#!/usr/bin/env bun
/**
 * stack:full — one-command full local stack launcher.
 *
 * Usage:
 *   bun run scripts/stack/launch.ts [flags]
 *
 * Flags:
 *   --no-mobile    Skip Expo (mobile) host process
 *   --no-desktop   Skip Electron (desktop) host process
 *   --no-docker    Skip docker compose (run apps natively / already running)
 *   --no-matrix    Skip the final doctor matrix render
 *   --no-open      Skip Phase 5.5 (do not open any browser tabs)
 *   --open=<csv>   Open only a subset of surfaces, e.g. --open=website,api
 *   --quiet        Suppress per-service log streaming (status updates only)
 *   --help         Print this help text
 *
 * Phases:
 *   1.   Pre-flight     — check docker + docker-compose on PATH; warn on missing .env.docker
 *   2.   Compose up     — docker compose up -d --wait (waits for healthchecks)
 *   2.5. DB migrations  — drizzle-kit migrate via @t/db against localhost:5432; aborts on failure
 *   3.   Host apps      — Bun.spawn mobile (Expo) + desktop (Electron) in parallel
 *   4.   Readiness      — poll api:/bootstrap, web:/api/health, website:/api/health for HTTP 200
 *   5.   Doctor matrix  — bun run doctor --filter=api,web,website
 *   5.5. Open surfaces  — open browser tabs for website/web/api/mobile; confirm desktop PID
 *   6.   Idle           — print status box; wait for SIGINT/SIGTERM
 *   7.   Teardown       — kill host procs + docker compose down
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { pollUntilReadyWithProgress } from './health.ts'
import { startHeartbeat } from './heartbeat.ts'
import { type OpenSurfacesOptions, type SurfaceName, openSurfaces } from './open-url.ts'
import { SERVICES, type StackService } from './services.ts'
import { type AnsiColor, pipeWithPrefix } from './stream.ts'
import { createTeardown } from './teardown.ts'

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)

// Parse --open=<csv> into an allowlist, or null for "open all".
function parseOpenFlag(args: string[]): SurfaceName[] | null {
  const flag = args.find((a) => a.startsWith('--open='))
  if (!flag) return null
  const raw = flag.slice('--open='.length)
  const VALID: SurfaceName[] = ['website', 'web', 'api', 'mobile', 'desktop']
  return raw
    .split(',')
    .map((s) => s.trim() as SurfaceName)
    .filter((s) => VALID.includes(s))
}

const FLAGS = {
  noMobile: argv.includes('--no-mobile'),
  noDesktop: argv.includes('--no-desktop'),
  noDocker: argv.includes('--no-docker'),
  noMatrix: argv.includes('--no-matrix'),
  noOpen: argv.includes('--no-open'),
  quiet: argv.includes('--quiet'),
  noHeartbeat: argv.includes('--no-heartbeat'),
  help: argv.includes('--help') || argv.includes('-h'),
  /** null means "open all"; string[] means "open only these" */
  openAllowlist: parseOpenFlag(argv),
}

const USAGE = `
stack:full — boot the entire monorepo locally

Usage:
  bun run scripts/stack/launch.ts [flags]

Flags:
  --no-mobile    Skip Expo (mobile) host process
  --no-desktop   Skip Electron (desktop) host process
  --no-docker    Skip docker compose (already running or native mode)
  --no-matrix    Skip final doctor matrix render
  --no-open      Skip Phase 5.5 (do not open any browser tabs)
  --open=<csv>   Open only specific surfaces (comma-separated subset of:
                   website, web, api, mobile, desktop)
                 Example: --open=website,api
  --quiet        Suppress per-service log streaming
  --no-heartbeat Suppress elapsed-time heartbeat ticks during long phases
  --help         Show this message

Available npm scripts (root package.json):
  bun run up                       Alias — boot everything (stack:full)
  bun run stack:full               Boot everything (docker + migrations + all apps)
  bun run stack:full:nodocker      Skip docker compose (and migrations)
  bun run stack:full:apionly       API only (no mobile/desktop)
`.trim()

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

const log = {
  info: (msg: string) => console.log(`${DIM}[stack]${RESET} ${msg}`),
  ok: (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`),
  warn: (msg: string) => console.log(`${YELLOW}⚠${RESET}  ${msg}`),
  error: (msg: string) => console.error(`${RED}✗${RESET} ${msg}`),
  section: (msg: string) => console.log(`\n${BOLD}${msg}${RESET}`),
}

// ---------------------------------------------------------------------------
// Exported phase functions (unit-testable)
// ---------------------------------------------------------------------------

export type PreflightResult = {
  dockerOk: boolean
  envFileOk: boolean
  envFilePath: string
  warnings: string[]
}

/**
 * Phase 1 — Pre-flight checks.
 * Validates tool availability and env file presence.
 */
export async function preflight(): Promise<PreflightResult> {
  const warnings: string[] = []

  const dockerBin = Bun.which('docker')
  const dockerOk = dockerBin !== null

  if (!dockerOk) {
    warnings.push('`docker` not found on PATH — docker phases will fail')
  }

  // Check for docker compose (plugin style)
  let composeOk = false
  if (dockerOk) {
    const probe = Bun.spawn(['docker', 'compose', 'version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await probe.exited
    composeOk = probe.exitCode === 0
    if (!composeOk) {
      warnings.push('`docker compose` plugin not available — try updating Docker Desktop')
    }
  }

  const repoRoot = resolve(import.meta.dir, '../..')
  const envPath = resolve(repoRoot, '.env.docker')
  const envExamplePath = resolve(repoRoot, '.env.docker.example')

  let envFileOk = existsSync(envPath)
  const hasExample = existsSync(envExamplePath)

  if (!envFileOk) {
    if (hasExample) {
      // Auto-copy example so docker compose doesn't hard-error on missing env_file
      const exampleContent = await Bun.file(envExamplePath).text()
      await Bun.write(envPath, exampleContent)
      envFileOk = true
      log.info(
        'ℹ  Copied .env.docker.example → .env.docker (using example defaults — populate with real values for production-like behavior)',
      )
    } else {
      log.error(
        '.env.docker is missing and no .env.docker.example exists — cannot start docker services',
      )
      process.exit(1)
    }
  }

  return {
    dockerOk: dockerOk && composeOk,
    envFileOk,
    envFilePath: envPath,
    warnings,
  }
}

export type ComposeUpOptions = {
  quiet?: boolean
  /** When true, suppresses the elapsed-time heartbeat printed during quiet mode. */
  noHeartbeat?: boolean
}

/**
 * Phase 2 — docker compose up -d --wait.
 * Returns true on success (exit code 0).
 *
 * When `quiet` is set, docker output is suppressed. A heartbeat ticker is
 * printed every 5 s so the terminal does not appear frozen. Pass
 * `noHeartbeat: true` to suppress the ticker.
 */
export async function composeUp(opts: ComposeUpOptions = {}): Promise<boolean> {
  const proc = Bun.spawn(['docker', 'compose', 'up', '-d', '--wait'], {
    stdout: opts.quiet ? 'pipe' : 'inherit',
    stderr: opts.quiet ? 'pipe' : 'inherit',
  })

  let stopBeat: (() => void) | undefined
  if (opts.quiet && !opts.noHeartbeat) {
    stopBeat = startHeartbeat({ label: 'docker compose up --wait', intervalMs: 5_000 })
  }

  try {
    await proc.exited
  } finally {
    stopBeat?.()
  }

  return proc.exitCode === 0
}

export type MigrationResult = {
  success: boolean
  exitCode: number | null
  hostUrl: string
}

/**
 * Phase 2.5 — run Drizzle migrations against the host-facing Postgres.
 *
 * The DATABASE_URL stored in .env.docker uses the Docker-internal hostname
 * (`db`) which is unreachable from the host machine. We derive a
 * host-facing URL (`localhost:5432`) from the same credentials so
 * drizzle-kit can connect after `docker compose up --wait` completes.
 *
 * The function reads POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB from
 * the current environment (inherited from the shell or .env.docker) and
 * falls back to the well-known docker-compose defaults. If none of those
 * vars are present it constructs a localhost URL from those defaults.
 *
 * Fails loudly (process.exit) when migration exits non-zero — prevents
 * broken apps booting against a schema-mismatched database.
 */
export async function runMigrations(): Promise<MigrationResult> {
  const repoRoot = resolve(import.meta.dir, '../..')

  // Build a host-facing URL even when the shell's DATABASE_URL points at
  // the Docker-internal hostname (`db`).
  const user = process.env.POSTGRES_USER ?? 'postgres'
  const password = process.env.POSTGRES_PASSWORD ?? 'postgres'
  const db = process.env.POSTGRES_DB ?? 'template'
  const hostUrl = `postgres://${user}:${encodeURIComponent(password)}@localhost:5433/${db}`

  const proc = Bun.spawn(['bun', 'run', '--filter', '@t/db', 'db:migrate'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: hostUrl,
    },
  })

  await proc.exited

  return {
    success: proc.exitCode === 0,
    exitCode: proc.exitCode,
    hostUrl,
  }
}

export type HostAppHandles = {
  mobile: Bun.Subprocess | null
  desktop: Bun.Subprocess | null
}

/**
 * Phase 3 — spawn host apps (mobile + desktop) in parallel.
 * Respects --no-mobile / --no-desktop flags passed in opts.
 */
/** Per-service streaming config for host-spawned processes. */
const HOST_STREAM_CONFIG: Record<string, { label: string; color: AnsiColor }> = {
  mobile: { label: 'mobile', color: 'cyan' },
  desktop: { label: 'desktop', color: 'magenta' },
}

/**
 * Narrows a Bun subprocess stream to the shape pipeWithPrefix accepts.
 * Bun types stdout/stderr as `number | ReadableStream<Uint8Array> | undefined`
 * where `number` appears when stdio mode is 'inherit'/'ignore'. We only ever
 * set `stdout: 'pipe'` / `stderr: 'pipe'` in hostSpawn, so the numeric branch
 * never occurs at runtime, but we must satisfy the type-checker.
 */
function asReadable(
  stream: number | ReadableStream<Uint8Array> | undefined,
): ReadableStream<Uint8Array> | null {
  return typeof stream === 'object' && stream !== null ? stream : null
}

/**
 * Attaches pipeWithPrefix to a subprocess's stdout and stderr (fire-and-forget).
 * No-ops when FLAGS.quiet is true or when the subprocess is null.
 */
function teeHostProc(name: string, proc: Bun.Subprocess | null): void {
  if (FLAGS.quiet || proc === null) return
  const cfg = HOST_STREAM_CONFIG[name]
  if (!cfg) return
  void pipeWithPrefix(asReadable(proc.stdout), { label: cfg.label, color: cfg.color })
  void pipeWithPrefix(asReadable(proc.stderr), {
    label: cfg.label,
    color: cfg.color,
    stream: process.stderr,
  })
}

export function spawnHostApps(opts: { noMobile?: boolean; noDesktop?: boolean }): HostAppHandles {
  const mobileService = SERVICES.find(
    (s): s is StackService & { spawn: () => Bun.Subprocess } =>
      s.name === 'mobile' && s.kind === 'host' && typeof s.spawn === 'function',
  )
  const desktopService = SERVICES.find(
    (s): s is StackService & { spawn: () => Bun.Subprocess } =>
      s.name === 'desktop' && s.kind === 'host' && typeof s.spawn === 'function',
  )

  const handles: HostAppHandles = {
    mobile: !opts.noMobile && mobileService ? mobileService.spawn() : null,
    desktop: !opts.noDesktop && desktopService ? desktopService.spawn() : null,
  }

  teeHostProc('mobile', handles.mobile)
  teeHostProc('desktop', handles.desktop)

  return handles
}

export type ReadinessResult = {
  api: boolean
  web: boolean
  website: boolean
}

/**
 * Phase 4 — poll readiness endpoints for all three app targets.
 *
 * - api     (3000): /bootstrap — Hono endpoint, no auth middleware
 * - web     (3001): /api/health — Clerk middleware excludes /api/health;
 *                   /bootstrap is a Next.js page that Clerk intercepts (500)
 * - website (3002): /api/health — same Clerk-exclusion rationale as web
 *
 * timeoutMs applies independently to each endpoint.
 *
 * This overload is the stable public signature — tests depend on it.
 */
export async function waitForReady(timeoutMs?: number): Promise<ReadinessResult>
export async function waitForReady(
  timeoutMs?: number,
  opts?: { noHeartbeat?: boolean },
): Promise<ReadinessResult>
export async function waitForReady(
  timeoutMs = 60_000,
  opts: { noHeartbeat?: boolean } = {},
): Promise<ReadinessResult> {
  // Resolved names for the three targets
  const ENDPOINTS = [
    {
      key: 'api' as const,
      url: 'http://localhost:3000/bootstrap',
      short: 'api    :3000/bootstrap',
    },
    {
      key: 'web' as const,
      url: 'http://localhost:3001/api/health',
      short: 'web    :3001/api/health',
    },
    {
      key: 'website' as const,
      url: 'http://localhost:3002/api/health',
      short: 'website:3002/api/health',
    },
  ]

  // Per-endpoint tracking for heartbeat ticks
  const resolvedAt = new Map<string, number>()

  // Heartbeat ticker: prints a combined "still polling" summary every 5 s
  let stopBeat: (() => void) | undefined
  if (!opts.noHeartbeat) {
    stopBeat = startHeartbeat({
      label: 'Waiting for readiness endpoints',
      intervalMs: 5_000,
      onTick: (elapsedMs) => {
        const elapsedSec = (elapsedMs / 1_000).toFixed(1)
        const DIM_ANSI = '\x1b[2m'
        const RESET_ANSI = '\x1b[0m'
        const pendingNames = ENDPOINTS.filter((e) => !resolvedAt.has(e.key))
          .map((e) => e.short.trim())
          .join(', ')
        if (pendingNames) {
          const line = `${DIM_ANSI}... still polling: ${pendingNames} (${elapsedSec}s)${RESET_ANSI}`
          if (process.stdout.isTTY) {
            process.stdout.write(`\r${line.padEnd(80)}`)
          } else {
            process.stdout.write(`${line}\n`)
          }
        }
      },
    })
  }

  try {
    const results = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        const ok = await pollUntilReadyWithProgress(
          ep.url,
          { timeoutMs },
          (_url, isOk, elapsed) => {
            if (isOk && !resolvedAt.has(ep.key)) {
              resolvedAt.set(ep.key, elapsed)
              // Clear the ticker line before printing the ✓ so they don't collide
              if (!opts.noHeartbeat && process.stdout.isTTY) {
                process.stdout.write(`\r${' '.repeat(82)}\r`)
              }
              const elapsedSec = (elapsed / 1_000).toFixed(1)
              log.ok(`${ep.short} → 200 (${elapsedSec}s)`)
            }
          },
        )
        return { key: ep.key, ok }
      }),
    )

    const result: ReadinessResult = { api: false, web: false, website: false }
    for (const r of results) {
      result[r.key] = r.ok
    }
    return result
  } finally {
    stopBeat?.()
  }
}

/**
 * Phase 5 — run doctor matrix (filter to api,web,website).
 *
 * Streams stdout/stderr to the terminal in real time via `pipeWithPrefix` so
 * users see doctor progress as it runs. Also collects the combined output and
 * returns it — the return signature is unchanged so existing callers/tests
 * are unaffected.
 */
export async function runDoctorMatrix(opts: { noHeartbeat?: boolean } = {}): Promise<string> {
  const repoRoot = resolve(import.meta.dir, '../..')
  const proc = Bun.spawn(['bun', 'run', 'doctor', '--filter=api,web,website', '--fast'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Heartbeat so a slow doctor doesn't appear frozen between its own output lines
  let stopBeat: (() => void) | undefined
  if (!opts.noHeartbeat) {
    stopBeat = startHeartbeat({ label: 'Doctor matrix running', intervalMs: 5_000 })
  }

  // Tee both streams: collect into strings AND pipe to terminal live.
  // We need to clone each ReadableStream because pipeWithPrefix consumes it.
  const [stdoutA, stdoutB] = proc.stdout.tee()
  const [stderrA, stderrB] = proc.stderr.tee()

  const [outText, errText] = await Promise.all([
    // Collect side — buffer into text
    new Response(stdoutA).text(),
    new Response(stderrA).text(),
    // Live side — pipe to terminal with [doctor] prefix
    pipeWithPrefix(stdoutB, { label: 'doctor', color: 'blue' }),
    pipeWithPrefix(stderrB, { label: 'doctor', color: 'red', stream: process.stderr }),
    proc.exited,
  ]).then(([out, err]) => [out, err] as [string, string])

  stopBeat?.()

  const combined = [outText, errText].filter(Boolean).join('\n')
  return combined
}

// ---------------------------------------------------------------------------
// Status box renderer
// ---------------------------------------------------------------------------

function renderStatusBox(handles: HostAppHandles): void {
  const dockerServices = SERVICES.filter((s) => s.kind === 'docker')
  const lines: string[] = [
    '',
    `${BOLD}┌─ Stack Running ────────────────────────────────────┐${RESET}`,
  ]

  for (const svc of dockerServices) {
    const url = svc.url ? `  ${DIM}${svc.url}${RESET}` : ''
    lines.push(`│  ${GREEN}●${RESET} ${svc.name.padEnd(10)}${url}`)
  }

  if (handles.mobile) {
    lines.push(`│  ${GREEN}●${RESET} mobile     ${DIM}(Expo Metro — see terminal)${RESET}`)
  }
  if (handles.desktop) {
    lines.push(`│  ${GREEN}●${RESET} desktop    ${DIM}(Electron — see terminal)${RESET}`)
  }

  lines.push(`${BOLD}└────────────────────────────────────────────────────┘${RESET}`)
  lines.push(`${DIM}Press Ctrl+C to tear down.${RESET}\n`)

  for (const line of lines) {
    console.log(line)
  }
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (FLAGS.help) {
    console.log(USAGE)
    process.exit(0)
  }

  const hostProcs: Bun.Subprocess[] = []

  // ── Phase 1: Pre-flight ──────────────────────────────────────────────────
  log.section('Phase 1 — Pre-flight')
  const flight = await preflight()

  for (const w of flight.warnings) {
    log.warn(w)
  }

  if (!flight.envFileOk) {
    log.warn('Continuing with example defaults — some services may fail')
  } else {
    log.ok('.env.docker found')
  }

  if (!flight.dockerOk && !FLAGS.noDocker) {
    log.error('docker or docker compose unavailable. Use --no-docker to skip compose phases.')
    process.exit(1)
  }

  // ── Phase 2: Compose up ──────────────────────────────────────────────────
  if (!FLAGS.noDocker) {
    log.section('Phase 2 — docker compose up -d --wait')
    log.info('Starting docker services (waiting for healthchecks)…')

    const ok = await composeUp({ quiet: FLAGS.quiet, noHeartbeat: FLAGS.noHeartbeat })

    if (!ok) {
      log.error('docker compose up failed. Check logs: bun run stack:logs')
      process.exit(1)
    }
    log.ok('Docker services healthy')
  } else {
    log.section('Phase 2 — skipped (--no-docker)')
  }

  // ── Phase 2.5: DB migrations ─────────────────────────────────────────────
  if (!FLAGS.noDocker) {
    log.section('Phase 2.5 — DB migrations (drizzle-kit migrate)')
    log.info('Running @t/db db:migrate against localhost:5432…')

    const migration = await runMigrations()

    if (!migration.success) {
      log.error(
        `DB migration failed (exit code ${migration.exitCode}). ` +
          'Aborting — fix the migration before booting apps.',
      )
      process.exit(1)
    }
    log.ok('Migrations applied')
  } else {
    log.section('Phase 2.5 — skipped (--no-docker)')
  }

  // ── Phase 3: Host apps ───────────────────────────────────────────────────
  log.section('Phase 3 — Host apps')

  const handles = spawnHostApps({ noMobile: FLAGS.noMobile, noDesktop: FLAGS.noDesktop })

  if (handles.mobile) {
    hostProcs.push(handles.mobile)
    log.ok('Expo (mobile) spawned')
  } else {
    log.info('Mobile skipped (--no-mobile)')
  }

  if (handles.desktop) {
    hostProcs.push(handles.desktop)
    log.ok('Electron (desktop) spawned')
  } else {
    log.info('Desktop skipped (--no-desktop)')
  }

  // Register teardown NOW — before any awaiting so SIGINT during boot is safe
  const teardown = createTeardown(hostProcs, { skipDocker: FLAGS.noDocker })
  process.on('SIGINT', teardown)
  process.on('SIGTERM', teardown)

  // ── Phase 4: Readiness ───────────────────────────────────────────────────
  if (!FLAGS.noDocker) {
    log.section('Phase 4 — Waiting for readiness endpoints')
    log.info('Polling api:/bootstrap  web:/api/health  website:/api/health…')

    const ready = await waitForReady(60_000, { noHeartbeat: FLAGS.noHeartbeat })

    // waitForReady prints ✓ inline as each endpoint resolves.
    // Only emit warnings for endpoints that timed out.
    if (!ready.api) {
      log.warn('API     :3000/bootstrap did not return 200 within 60s')
    }
    if (!ready.web) {
      log.warn('Web     :3001/api/health did not return 200 within 60s')
    }
    if (!ready.website) {
      log.warn('Website :3002/api/health did not return 200 within 60s')
    }
  } else {
    log.section('Phase 4 — skipped (--no-docker)')
  }

  // ── Phase 5: Doctor matrix ───────────────────────────────────────────────
  if (!FLAGS.noMatrix) {
    log.section('Phase 5 — Doctor matrix')
    // runDoctorMatrix streams output live via pipeWithPrefix; the returned
    // string is the combined capture for callers that need it post-run.
    await runDoctorMatrix({ noHeartbeat: FLAGS.noHeartbeat })
  } else {
    log.section('Phase 5 — skipped (--no-matrix)')
  }

  // ── Phase 5.5: Open surfaces ─────────────────────────────────────────────
  if (FLAGS.noOpen) {
    log.section('Phase 5.5 — skipped (--no-open)')
  } else {
    const openOpts: OpenSurfacesOptions = {
      ...(FLAGS.openAllowlist ? { allowlist: FLAGS.openAllowlist } : {}),
    }
    // Non-fatal — failures must not abort the launcher.
    try {
      await openSurfaces(openOpts)
    } catch (err) {
      log.warn(
        `Phase 5.5 encountered an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // ── Phase 6: Idle ────────────────────────────────────────────────────────
  renderStatusBox(handles)
  log.section('Phase 6 — Idle (Ctrl+C to tear down)')

  // Keep the process alive indefinitely — SIGINT/SIGTERM will invoke teardown
  await new Promise<void>(() => {
    // intentionally never resolves
  })
}

// Only run main() when this file is the direct entry point (not when imported
// by tests or other modules). `import.meta.main` is `true` in Bun when the
// file is invoked directly, and `undefined` when imported as a module (e.g.
// in vitest / vite-node). Explicitly require `=== true` so the guard fires
// only under Bun's direct-execution context.
if (import.meta.main === true) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
