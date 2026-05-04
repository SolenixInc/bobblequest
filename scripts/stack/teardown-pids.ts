#!/usr/bin/env bun
/**
 * Standalone PID-file teardown — run by `bun run stack:down`.
 *
 * Reads all `.stack/pids/<service>.pid` files written by Phase 3 of
 * `bun run up` / `bun run stack:full`, kills those processes (with a
 * 3 s SIGTERM → SIGKILL grace period on Unix, or taskkill /T → /F on
 * Windows), then deletes the PID files.
 *
 * After host-process teardown, runs soft-tier docker cleanup:
 *   - docker compose down --remove-orphans
 *   - docker image prune -f  (dangling/untagged layers only; named volumes preserved)
 *
 * For deeper cleanup (volumes, build cache, full system prune) use:
 *   bun run stack:clean   — drops volumes + build cache + managed images
 *   bun run stack:nuke    — full docker system prune (all host resources)
 */

import { killAllFromPidFiles, readAllPidFiles } from './pid-file.ts'
import { pruneDocker } from './cleanup.ts'

const entries = readAllPidFiles()

if (entries.length === 0) {
  console.log('[stack] No host service PID files found — nothing to kill.')
} else {
  console.log(
    `[stack] Killing host services: ${entries.map((e) => `${e.name}(${e.pid})`).join(', ')}`,
  )
  await killAllFromPidFiles()
  console.log('[stack] Host services terminated.')
}

// Soft-tier docker cleanup: compose down + dangling image prune (volumes preserved).
await pruneDocker('soft')
