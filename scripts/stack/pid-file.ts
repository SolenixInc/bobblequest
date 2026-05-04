/**
 * PID-file utilities for host-spawned stack services.
 *
 * Layout: <repo-root>/.stack/pids/<service-name>.pid
 *
 * Design goals:
 *   - Surviving `bun run stack:down` invocations from a *separate* process.
 *   - Cross-platform kill: taskkill /T on Windows, SIGTERM+SIGKILL on Unix.
 *   - Idempotent: reading or removing a missing PID file is a no-op.
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to <repo-root>/.stack/pids */
export function getPidDir(): string {
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url)).replace(/[/]$/, '')
  return join(repoRoot, '.stack', 'pids')
}

/** Write `<pidDir>/<name>.pid` with the given PID. Creates the directory if needed. */
export function writePidFile(name: string, pid: number): void {
  const dir = getPidDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.pid`), String(pid), 'utf8')
}

/** Read all PID files and return `{ name, pid }[]`. Missing / unparseable files are skipped. */
export function readAllPidFiles(): Array<{ name: string; pid: number }> {
  const dir = getPidDir()
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((f) => f.endsWith('.pid'))
    .flatMap((f) => {
      const raw = readFileSync(join(dir, f), 'utf8').trim()
      const pid = Number(raw)
      if (!Number.isFinite(pid) || pid <= 0) return []
      return [{ name: basename(f, '.pid'), pid }]
    })
}

/** Remove a single PID file. No-op if it does not exist. */
export function removePidFile(name: string): void {
  const path = join(getPidDir(), `${name}.pid`)
  try {
    unlinkSync(path)
  } catch {
    // Already gone — normal after a clean teardown
  }
}

/** Grace period (ms) before escalating SIGTERM -> SIGKILL / taskkill /F */
const GRACE_MS = 3_000

/**
 * Kill a process by PID using a platform-aware strategy.
 *
 * Windows:
 *   1. `taskkill /T /PID <pid>`        - graceful tree kill
 *   2. After grace: `taskkill /F /T /PID <pid>` - forced tree kill
 *
 * Unix:
 *   1. SIGTERM
 *   2. After grace: SIGKILL
 *
 * Returns `true` if the process appears dead after the operation, `false` if
 * the kill call itself threw unexpectedly.
 */
export async function killByPid(pid: number): Promise<boolean> {
  const isWindows = process.platform === 'win32'

  /** Check whether the PID is still alive (cross-platform). */
  function isAlive(): boolean {
    try {
      // signal 0 = existence check; throws if process is gone
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  if (!isAlive()) return true

  if (isWindows) {
    // Graceful tree kill (no /F) - spawnSync avoids Bun dependency
    try {
      spawnSync('taskkill', ['/T', '/PID', String(pid)], { stdio: 'pipe' })
    } catch {
      // May throw if process already exited - ignore
    }

    // Wait up to GRACE_MS
    const deadline = Date.now() + GRACE_MS
    while (Date.now() < deadline && isAlive()) {
      await new Promise<void>((r) => setTimeout(r, 200))
    }

    if (isAlive()) {
      // Forced tree kill
      try {
        spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'pipe' })
      } catch {
        // Ignore
      }
    }
  } else {
    // Unix: SIGTERM -> wait -> SIGKILL
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      return true // already dead
    }

    const deadline = Date.now() + GRACE_MS
    while (Date.now() < deadline && isAlive()) {
      await new Promise<void>((r) => setTimeout(r, 200))
    }

    if (isAlive()) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // Ignore
      }
    }
  }

  return !isAlive()
}

/**
 * Kill every process recorded in PID files then delete those files.
 * Safe to call from any process (not just the one that spawned them).
 */
export async function killAllFromPidFiles(): Promise<void> {
  const entries = readAllPidFiles()
  if (entries.length === 0) return

  await Promise.allSettled(
    entries.map(async ({ name, pid }) => {
      await killByPid(pid)
      removePidFile(name)
    }),
  )
}

/**
 * Find the PID(s) listening on a given TCP port using a platform-aware strategy.
 *
 * Windows: `netstat -ano -p TCP` + regex to extract the owning PID.
 * Unix:    `lsof -t -i TCP:<port>` — returns one PID per line.
 *
 * Returns an empty array when nothing is listening on the port.
 */
export function getPidsOnPort(port: number): number[] {
  const isWindows = process.platform === 'win32'

  try {
    if (isWindows) {
      // netstat -ano outputs lines like:
      //   TCP    0.0.0.0:8081    0.0.0.0:0    LISTENING    1234
      const result = spawnSync('netstat', ['-ano', '-p', 'TCP'], { stdio: 'pipe' })
      if (result.status !== 0 || !result.stdout) return []
      const output = result.stdout.toString()
      const portPattern = new RegExp(`[\\s:]${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'gim')
      const pids: number[] = Array.from(output.matchAll(portPattern), (m) => Number(m[1])).filter(
        (n) => n > 0,
      )
      return [...new Set(pids)]
    } else {
      // lsof -t: terse output — one PID per line
      const result = spawnSync('lsof', ['-t', `-i:${port}`], { stdio: 'pipe' })
      if (result.status !== 0 || !result.stdout) return []
      return result.stdout
        .toString()
        .split('\n')
        .map((l) => Number(l.trim()))
        .filter((n) => n > 0)
    }
  } catch {
    return []
  }
}

/**
 * Belt-and-suspenders port sweep: after PID-file-based teardown, kill any
 * process still holding one of the known host-service ports.
 *
 * This catches the case where the recorded PID was stale (shell wrapper had
 * already exited) and the real Metro/Vite process survived PID-based teardown.
 */
export async function killOrphanedPortProcesses(ports: number[]): Promise<void> {
  const allPids = ports.flatMap(getPidsOnPort)
  const unique = [...new Set(allPids)]
  if (unique.length === 0) return
  await Promise.allSettled(unique.map(killByPid))
}

/** Well-known ports used by host-spawned stack services. */
export const HOST_SERVICE_PORTS: readonly number[] = [
  8081, // Metro / Expo bundler
  5173, // electron-vite dev renderer
] as const
