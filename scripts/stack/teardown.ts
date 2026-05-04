/**
 * Teardown factory.
 *
 * Creates a cleanup function that:
 *   1. Kills every spawned host-app subprocess (SIGTERM -> wait 5s -> SIGKILL).
 *   2. Kills any host-app processes recorded in .stack/pids/ PID files
 *      (covers the case where teardown runs in a different process, e.g.
 *      `bun run stack:down`).
 *   3. Runs docker cleanup at the requested tier (default: 'soft').
 *      Soft tier = docker compose down --remove-orphans + docker image prune -f.
 *      See cleanup.ts for volumes and nuke tiers.
 *   4. Exits with code 0.
 *
 * Usage:
 *   const cleanup = createTeardown(procs)
 *   process.on('SIGINT', cleanup)
 *   process.on('SIGTERM', cleanup)
 */

import { HOST_SERVICE_PORTS, killAllFromPidFiles, killOrphanedPortProcesses } from './pid-file.ts'
import { pruneDocker } from './cleanup.ts'
import type { CleanupTier, CleanupSpawnFn } from './cleanup.ts'

const GRACE_MS = 5_000

/**
 * Minimal interface for a subprocess handle - satisfied by Bun.Subprocess
 * and by plain mock objects in tests.
 *
 * kill signature matches Bun.Subprocess.kill: (exitCode?: number | NodeJS.Signals) => void
 */
export type SubprocessHandle = {
  exitCode: number | null
  kill: (signal?: number | NodeJS.Signals) => void
  exited?: Promise<number>
}

/**
 * Injectable spawn function signature for `docker compose down`.
 * Defaults to Bun.spawn in production; can be replaced in tests.
 */
export type SpawnFn = (cmd: string[], opts: { stdout: string; stderr: string }) => SubprocessHandle

async function killProc(proc: SubprocessHandle): Promise<void> {
  if (proc.exitCode !== null) return

  try {
    proc.kill('SIGTERM')
  } catch {
    // already dead - normal on Windows
  }

  const deadline = Date.now() + GRACE_MS
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) return
    await new Promise<void>((r) => setTimeout(r, 200))
  }

  try {
    proc.kill('SIGKILL')
  } catch {
    // already dead
  }
}

async function composeDown(spawnFn: SpawnFn): Promise<void> {
  console.log('\nRunning docker compose down...')
  const proc = spawnFn(['docker', 'compose', 'down'], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (proc.exited) await proc.exited
}

/**
 * Returns a cleanup function bound to the provided subprocess list.
 * Call `process.on('SIGINT', cleanup)` / `process.on('SIGTERM', cleanup)`.
 *
 * @param procs    Subprocess handles spawned for host apps (mobile, desktop).
 * @param opts     Additional options.
 */
export function createTeardown(
  procs: SubprocessHandle[],
  opts: {
    skipDocker?: boolean
    /** Override Bun.spawn for the legacy composeDown path. Defaults to global Bun.spawn. */
    spawnFn?: SpawnFn
    /**
     * Override the PID-file killer for tests.
     * Defaults to `killAllFromPidFiles` which reads `.stack/pids/`.
     */
    killPidFiles?: () => Promise<void>
    /**
     * Override the port-sweep killer for tests.
     * Defaults to `killOrphanedPortProcesses(HOST_SERVICE_PORTS)`.
     *
     * The port sweep is a belt-and-suspenders step: after PID-file-based kills,
     * any process still holding a known host-service port (e.g. Metro on 8081,
     * electron-vite on 5173) is force-killed. This catches the case where the
     * recorded PID was a stale shell wrapper and the real child survived.
     */
    killOrphanedPorts?: () => Promise<void>
    /**
     * Cleanup tier for docker artifact pruning.
     *   'soft'    — compose down --remove-orphans + image prune (default)
     *   'volumes' — soft + volume removal + builder + managed image prune
     *   'nuke'    — volumes + full system prune (interactive confirm unless force)
     *
     * When set, pruneDocker() handles all docker teardown (replaces composeDown).
     * When undefined (legacy), the original composeDown() path is used.
     */
    cleanupTier?: CleanupTier
    /** Injectable spawn for cleanup.ts — used in tests. */
    cleanupSpawnFn?: CleanupSpawnFn
    /** Skip interactive confirm for nuke tier (e.g. CI). */
    forceCleanup?: boolean
  } = {},
): () => Promise<void> {
  let ran = false

  // Defer Bun global access to call-time so tests can control the environment
  const spawn: SpawnFn =
    opts.spawnFn ??
    // biome-ignore lint/suspicious/noExplicitAny: Bun global not in Node types
    ((cmd, spawnOpts) => (globalThis as any).Bun.spawn(cmd, spawnOpts))

  const pidFileKiller = opts.killPidFiles ?? killAllFromPidFiles
  const portKiller =
    opts.killOrphanedPorts ?? (() => killOrphanedPortProcesses([...HOST_SERVICE_PORTS]))

  return async function cleanup(): Promise<void> {
    // Guard: only run once even if both SIGINT and SIGTERM fire
    if (ran) return
    ran = true

    console.log('\nTearing down stack...')

    // Kill in-memory subprocess handles (Phase 3 processes from this invocation)
    await Promise.allSettled(procs.map(killProc))

    // Kill any host-app processes tracked in PID files (covers `bun run stack:down`
    // which runs in a separate process and has no in-memory handles).
    await pidFileKiller()

    // Belt-and-suspenders: sweep known host-service ports (8081, 5173).
    // Catches orphaned Metro/Vite processes whose parent PID wrapper already exited.
    await portKiller()

    if (!opts.skipDocker) {
      if (opts.cleanupTier !== undefined) {
        // Tiered cleanup: pruneDocker handles compose down + image pruning.
        await pruneDocker(opts.cleanupTier, {
          spawnFn: opts.cleanupSpawnFn,
          force: opts.forceCleanup,
        })
      } else {
        // Legacy path: plain docker compose down (no prune).
        await composeDown(spawn)
      }
    }

    console.log('Stack down.')
    process.exit(0)
  }
}
