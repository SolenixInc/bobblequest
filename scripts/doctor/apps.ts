/**
 * Data-driven app registry for the doctor orchestrator.
 * To add/remove an app: edit APPS below. All other doctor logic is table-driven.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type AppKind = 'next' | 'hono' | 'expo' | 'electron'

export type AppEntry = {
  /** Display name shown in doctor output */
  name: string
  /** Local dev port, if applicable */
  port?: number
  /** The command that starts the dev server (passed to Bun.spawn as argv) */
  devCommand: string[]
  /** URL to GET for the bootstrap health probe; undefined = skip HTTP probe */
  probeUrl?: string
  /** Kind — drives default readyMatcher selection */
  kind: AppKind
  /**
   * Regexp matched against stdout/stderr lines to detect "server is ready".
   * Defaults are applied per-kind in spawn-app.ts when this is undefined.
   */
  readyMatcher?: RegExp
  /** Directory to spawn the process from (absolute or relative to repo root) */
  cwd: string
}

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname)

const ALL_APPS: AppEntry[] = [
  {
    name: 'api',
    port: 3000,
    devCommand: ['bun', 'run', '--watch', 'src/index.ts'],
    probeUrl: 'http://localhost:3000/bootstrap',
    kind: 'hono',
    cwd: 'apps/api',
  },
  {
    name: 'web',
    port: 3001,
    devCommand: ['bun', 'run', 'dev'],
    probeUrl: 'http://localhost:3001/api/health',
    kind: 'next',
    cwd: 'apps/web',
  },
  {
    name: 'website',
    port: 3002,
    devCommand: ['bun', 'run', 'dev'],
    probeUrl: 'http://localhost:3002/api/health',
    kind: 'next',
    cwd: 'apps/website',
  },
  {
    name: 'mobile',
    port: undefined,
    devCommand: ['bun', 'run', 'dev'],
    probeUrl: undefined, // Metro bundler — no HTTP probe
    kind: 'expo',
    readyMatcher: /Metro waiting on/,
    cwd: 'apps/mobile',
  },
  {
    name: 'desktop',
    port: undefined,
    devCommand: ['bun', 'run', 'dev'],
    probeUrl: undefined, // Electron window — no HTTP probe
    kind: 'electron',
    readyMatcher: /ready in|App is ready|electron/i,
    cwd: 'apps/desktop',
  },
]

/**
 * Exported APPS filters out any entry whose cwd does not exist on disk.
 * This makes mobile/desktop probes silently skipped when those directories
 * are absent rather than crashing the doctor run.
 */
export const APPS: AppEntry[] = ALL_APPS.filter((a) => existsSync(resolve(REPO_ROOT, a.cwd)))
