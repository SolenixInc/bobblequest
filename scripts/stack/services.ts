/**
 * Service registry - single source of truth for what stack:full boots.
 *
 * Docker services are started via `docker compose up -d --wait`.
 * Host services are spawned via Bun.spawn inside spawnHostApps().
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { writePidFile } from './pid-file.ts'

export type StackService = {
  /** Display name shown in status output */
  name: string
  /** Where the service runs */
  kind: 'docker' | 'host'
  /** URL exposed to the host (for status display / health checks on host services) */
  url?: string
  /** Factory that spawns the process - only for `host` kind */
  spawn?: () => Bun.Subprocess
  /** Custom readiness check - only for `host` kind */
  waitForReady?: () => Promise<boolean>
}

/** Absolute repo root (resolved at module load time). */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[/]$/, '')

/**
 * Returns a spawn factory only if the target directory exists on disk.
 * If the directory is missing, returns undefined so the service is skipped
 * rather than crashing at launch time.
 *
 * After spawning, the child PID is written to `.stack/pids/<name>.pid` so
 * that a standalone `bun run stack:down` can kill it even when running in
 * a different process from the one that did the spawning.
 */
function hostSpawn(
  name: string,
  cwd: string,
  command: string[],
): (() => Bun.Subprocess) | undefined {
  const absDir = `${REPO_ROOT}/${cwd}`
  if (!existsSync(absDir)) {
    return undefined
  }
  return () => {
    const proc = Bun.spawn(command, {
      cwd: absDir,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env },
    })
    if (proc.pid !== undefined) {
      writePidFile(name, proc.pid)
    }
    return proc
  }
}

export const SERVICES: StackService[] = [
  // -- Docker-managed ----------------------------------------------------------
  {
    name: 'api',
    kind: 'docker',
    url: 'http://localhost:3000',
  },
  {
    name: 'web',
    kind: 'docker',
    url: 'http://localhost:3001',
  },
  {
    name: 'website',
    kind: 'docker',
    url: 'http://localhost:3002',
  },
  {
    name: 'db',
    kind: 'docker',
    url: 'postgres://localhost:5433',
  },
  {
    name: 'redis',
    kind: 'docker',
    url: 'redis://localhost:6380',
  },
  // -- Host-spawned ------------------------------------------------------------
  //
  // Use direct CLI invocations rather than `bun run dev` shell wrappers.
  //
  // On Windows, `bun run dev` spawns an intermediate cmd.exe/bun wrapper whose
  // PID is what Bun.spawn records. That wrapper exits after launching the real
  // child process (Metro / electron-vite), making the saved PID stale. The
  // actual node.exe holding port 8081 (Metro) or 5173 (Electron dev server) is
  // a different PID that taskkill /T misses because the parent process tree is
  // already gone. Calling the CLI directly means proc.pid IS the process that
  // holds the port, so /T kills it correctly.
  {
    name: 'mobile',
    kind: 'host',
    spawn: hostSpawn('mobile', 'apps/mobile', ['bunx', 'expo', 'start']),
  },
  {
    name: 'desktop',
    kind: 'host',
    spawn: hostSpawn('desktop', 'apps/desktop', ['bunx', 'electron-vite', 'dev']),
  },
]
