#!/usr/bin/env bun
/**
 * doctor.ts — end-to-end stack verifier for the template-repo monorepo.
 *
 * Usage:
 *   bun run doctor
 *   bun run doctor --fast          # skip build + live boot (phases 5-6)
 *   bun run doctor --ci            # JSON output, same exit codes
 *   bun run doctor --phase=4       # single phase (for debugging)
 *   bun run doctor --filter=api    # limit phase 6 to one app
 *   bun run doctor --reinstall     # force re-run bun install in phase 1
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { APPS, type AppEntry } from './doctor/apps.ts'
import { type PackageCoverage, median, readCoverageSummary } from './doctor/coverage-summary.ts'
import { probe } from './doctor/probe-http.ts'
import { bootApp } from './doctor/spawn-app.ts'

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const flags = {
  fast: args.includes('--fast'),
  ci: args.includes('--ci'),
  verbose: args.includes('--verbose'),
  reinstall: args.includes('--reinstall'),
  phase: (() => {
    const p = args.find((a) => a.startsWith('--phase='))
    return p ? Number.parseInt(p.split('=')[1], 10) : undefined
  })(),
  filter: (() => {
    const f = args.find((a) => a.startsWith('--filter='))
    return f ? f.split('=')[1] : undefined
  })(),
}

// ---------------------------------------------------------------------------
// ANSI helpers (no-op in --ci mode)
// ---------------------------------------------------------------------------

const RESET = flags.ci ? '' : '\x1b[0m'
const GREEN = flags.ci ? '' : '\x1b[32m'
const RED = flags.ci ? '' : '\x1b[31m'
const YELLOW = flags.ci ? '' : '\x1b[33m'
const BOLD = flags.ci ? '' : '\x1b[1m'
const DIM = flags.ci ? '' : '\x1b[2m'

function green(s: string) {
  return `${GREEN}${s}${RESET}`
}
function red(s: string) {
  return `${RED}${s}${RESET}`
}
function yellow(s: string) {
  return `${YELLOW}${s}${RESET}`
}
function bold(s: string) {
  return `${BOLD}${s}${RESET}`
}
function dim(s: string) {
  return `${DIM}${s}${RESET}`
}

// ---------------------------------------------------------------------------
// Result accumulation (for --ci JSON)
// ---------------------------------------------------------------------------

type PhaseResult = {
  phase: number
  name: string
  ok: boolean
  detail?: string
  subResults?: Record<string, unknown>[]
}

const results: PhaseResult[] = []

// ---------------------------------------------------------------------------
// Process lifecycle — ensure child processes are cleaned up
// ---------------------------------------------------------------------------

const cleanupFns: Array<() => Promise<void>> = []

async function runCleanup() {
  for (const fn of cleanupFns) {
    try {
      await fn()
    } catch {
      // best-effort
    }
  }
}

process.on('SIGINT', async () => {
  if (!flags.ci) console.log('\n\nInterrupted — cleaning up…')
  await runCleanup()
  process.exit(130)
})

process.on('SIGTERM', async () => {
  await runCleanup()
  process.exit(143)
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, '..')

function phaseLabel(n: number, total: number, name: string): string {
  return `[${n}/${total}] ${name.padEnd(22)}`
}

/**
 * Run a command via Bun.spawn, stream output to stderr (hidden in --ci),
 * return { ok, exitCode }.
 */
async function runCommand(
  cmd: string[],
  cwd: string = REPO_ROOT,
): Promise<{ ok: boolean; exitCode: number | null; output: string }> {
  const chunks: string[] = []
  const decoder = new TextDecoder()

  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: flags.ci ? 'pipe' : 'inherit',
    stderr: flags.ci ? 'pipe' : 'inherit',
    env: { ...process.env },
  })

  if (flags.ci) {
    // Collect output silently
    async function drain(stream: ReadableStream<Uint8Array> | null) {
      if (!stream) return
      const reader = stream.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(decoder.decode(value, { stream: true }))
      }
    }
    await Promise.all([drain(proc.stdout), drain(proc.stderr)])
  }

  await proc.exited
  return {
    ok: proc.exitCode === 0,
    exitCode: proc.exitCode,
    output: chunks.join(''),
  }
}

function printPhaseResult(n: number, total: number, name: string, ok: boolean, detail = '') {
  if (flags.ci) return
  const tick = ok ? green('✓') : red('✗')
  const detailStr = detail ? dim(`  ${detail}`) : ''
  console.log(`${bold(phaseLabel(n, total, name))}${tick}${detailStr}`)
}

// ---------------------------------------------------------------------------
// Phase 1 — Workspace install
// ---------------------------------------------------------------------------

async function phase1(): Promise<PhaseResult> {
  const lockFile = join(REPO_ROOT, 'bun.lock')
  const needsInstall = flags.reinstall || !existsSync(lockFile)
  let ok = true
  let detail = ''

  if (needsInstall) {
    const result = await runCommand(['bun', 'install'], REPO_ROOT)
    ok = result.ok
    detail = ok ? 'installed' : `exit ${result.exitCode}`
  } else {
    detail = 'lockfile present, skipped (pass --reinstall to force)'
  }

  return { phase: 1, name: 'Workspace install', ok, detail }
}

// ---------------------------------------------------------------------------
// Phase 2 — Typecheck
// ---------------------------------------------------------------------------

async function phase2(): Promise<PhaseResult> {
  const result = await runCommand(['bun', 'run', 'turbo', 'run', 'typecheck'], REPO_ROOT)
  return {
    phase: 2,
    name: 'Typecheck (turbo)',
    ok: result.ok,
    detail: result.ok ? '' : `exit ${result.exitCode}`,
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — Lint
// ---------------------------------------------------------------------------

async function phase3(): Promise<PhaseResult> {
  // turbo.json has "check" as the lint task (biome check)
  const result = await runCommand(['bun', 'run', 'turbo', 'run', 'check'], REPO_ROOT)
  return {
    phase: 3,
    name: 'Lint (biome check)',
    ok: result.ok,
    detail: result.ok ? '' : `exit ${result.exitCode}`,
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — Test + coverage
// ---------------------------------------------------------------------------

type CoverageRow = {
  package: string
  statements: string
  branches: string
  functions: string
  lines: string
}

function fmt(n: number): string {
  return `${n.toFixed(1)}%`
}

async function phase4(): Promise<PhaseResult> {
  const result = await runCommand(['bun', 'run', 'turbo', 'run', 'test:coverage'], REPO_ROOT)

  const summary = await readCoverageSummary(REPO_ROOT)

  const subResults: CoverageRow[] = summary.packages.map((p: PackageCoverage) => ({
    package: p.package,
    statements: fmt(p.metrics.statements),
    branches: fmt(p.metrics.branches),
    functions: fmt(p.metrics.functions),
    lines: fmt(p.metrics.lines),
  }))

  const stmtValues = summary.packages.map((p) => p.metrics.statements)
  const medianStmts = median(stmtValues)

  const detail = result.ok
    ? `${summary.count} packages, median ${fmt(medianStmts)} stmts`
    : `exit ${result.exitCode}`

  if (flags.verbose && !flags.ci && result.ok && summary.count > 0) {
    // Print per-package table
    const col = (s: string, w: number) => s.padEnd(w)
    console.log(
      `       ${dim(`${col('Package', 24)}${col('Stmts', 8)}${col('Branches', 10)}${col('Funcs', 8)}Lines`)}`,
    )
    for (const p of summary.packages) {
      const m = p.metrics
      const stmt = fmt(m.statements)
      const branch = fmt(m.branches)
      const fn = fmt(m.functions)
      const line = fmt(m.lines)
      const bad = m.statements < 80 || m.branches < 80
      const row = `       ${col(p.package, 24)}${col(stmt, 8)}${col(branch, 10)}${col(fn, 8)}${line}`
      console.log(bad ? yellow(row) : dim(row))
    }
  }

  return {
    phase: 4,
    name: 'Test + coverage',
    ok: result.ok,
    detail,
    subResults,
  }
}

// ---------------------------------------------------------------------------
// Phase 5 — Build
// ---------------------------------------------------------------------------

async function phase5(): Promise<PhaseResult> {
  const result = await runCommand(['bun', 'run', 'turbo', 'run', 'build'], REPO_ROOT)
  return {
    phase: 5,
    name: 'Build (turbo)',
    ok: result.ok,
    detail: result.ok ? `${APPS.length} apps` : `exit ${result.exitCode}`,
  }
}

// ---------------------------------------------------------------------------
// Phase 6 — Live boot probes
// ---------------------------------------------------------------------------

type BootProbeRow = {
  app: string
  port?: number
  probeUrl?: string
  ok: boolean
  latencyMs?: number
  status?: number
  envStatus?: string
  detail: string
}

async function runBootProbe(entry: AppEntry): Promise<BootProbeRow> {
  const row: BootProbeRow = {
    app: entry.name,
    port: entry.port,
    probeUrl: entry.probeUrl,
    ok: false,
    detail: '',
  }

  const handle = bootApp(entry, REPO_ROOT, 90_000)
  cleanupFns.push(handle.stop)

  try {
    await handle.ready
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
    await handle.stop()
    row.detail = `boot failed: ${msg}`
    return row
  }

  if (!entry.probeUrl) {
    // mobile / desktop — just confirm it started
    row.ok = true
    row.detail = 'bundler/window opened (no HTTP probe)'
    await handle.stop()
    return row
  }

  // Probe the bootstrap URL
  const result = await probe(entry.probeUrl, {
    timeoutMs: 10_000,
    retries: 3,
    retryDelayMs: 1_500,
  })

  row.ok = result.ok
  row.latencyMs = result.latencyMs
  row.status = result.status

  if (result.ok) {
    // Parse bootstrap JSON fields for display
    if (typeof result.body === 'object' && result.body !== null) {
      const b = result.body as Record<string, unknown>
      const parts: string[] = []
      if ('env' in b) parts.push(`env=${b.env}`)
      if ('di' in b) {
        const di = b.di as Record<string, unknown>
        if (di && typeof di === 'object' && 'registered' in di) {
          parts.push(`di=${di.registered}/${di.total ?? '?'}`)
        }
      }
      if ('db' in b) parts.push(`db=${b.db}`)
      if ('trpc' in b) parts.push(`trpc=${b.trpc}`)
      if ('status' in b) parts.push(`status=${b.status}`)
      row.detail = parts.join(' ') || 'ok'
    } else {
      row.detail = 'ok'
    }
  } else {
    row.detail = result.error
      ? `probe failed: ${result.error}`
      : `probe failed: ${result.status ?? 'no response'}`
  }

  await handle.stop()
  return row
}

async function phase6(filterApp?: string): Promise<PhaseResult> {
  const targets = filterApp ? APPS.filter((a) => a.name === filterApp) : APPS

  if (targets.length === 0) {
    return {
      phase: 6,
      name: 'Live boot probes',
      ok: false,
      detail: `no app matches filter "${filterApp}"`,
    }
  }

  // Boot all targets in parallel
  const rows = await Promise.all(targets.map(runBootProbe))

  if (flags.verbose && !flags.ci) {
    for (const row of rows) {
      const tick = row.ok ? green('✓') : red('✗')
      const portStr = row.port ? `:${row.port}` : ' (no port)'
      const appPad = row.app.padEnd(10)
      const probePad = (
        row.probeUrl ? row.probeUrl.replace('http://localhost', '') : '(no probe)'
      ).padEnd(24)
      const latStr = row.latencyMs !== undefined ? dim(` ${row.latencyMs}ms`) : ''
      console.log(
        `       ${appPad}${dim(portStr.padEnd(8))}${dim(probePad)} ${tick}${latStr} ${dim(row.detail)}`,
      )
    }
  }

  const allOk = rows.every((r) => r.ok)
  return {
    phase: 6,
    name: 'Live boot probes',
    ok: allOk,
    detail: `${rows.filter((r) => r.ok).length}/${rows.length} ok`,
    subResults: rows as unknown as Record<string, unknown>[],
  }
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

const TOTAL_PHASES = 6

async function main() {
  if (!flags.ci) {
    console.log(bold('\n  template-repo doctor\n'))
  }

  const onlyPhase = flags.phase

  async function run(n: number, name: string, fn: () => Promise<PhaseResult>): Promise<boolean> {
    if (onlyPhase !== undefined && onlyPhase !== n) {
      return true // skip
    }
    const result = await fn()
    results.push(result)
    printPhaseResult(n, TOTAL_PHASES, name, result.ok, result.detail)
    return result.ok
  }

  let allOk = true

  allOk = (await run(1, 'Workspace install', phase1)) && allOk
  allOk = (await run(2, 'Typecheck (turbo)', phase2)) && allOk
  allOk = (await run(3, 'Lint (biome check)', phase3)) && allOk
  allOk = (await run(4, 'Test + coverage', phase4)) && allOk

  if (!flags.fast) {
    allOk = (await run(5, 'Build (turbo)', phase5)) && allOk
    allOk = (await run(6, 'Live boot probes', () => phase6(flags.filter))) && allOk
  } else if (!flags.ci) {
    console.log(dim('  [5/6] Build (turbo)          skipped (--fast)'))
    console.log(dim('  [6/6] Live boot probes       skipped (--fast)'))
  }

  if (flags.ci) {
    console.log(
      JSON.stringify(
        {
          ok: allOk,
          fast: flags.fast,
          phases: results,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`\n  ${allOk ? green('All checks passed.') : red('One or more checks failed.')}\n`)
  }

  await runCleanup()
  process.exit(allOk ? 0 : 1)
}

main().catch(async (err) => {
  console.error(err)
  await runCleanup()
  process.exit(1)
})
