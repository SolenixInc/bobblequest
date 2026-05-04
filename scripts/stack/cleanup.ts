/**
 * Docker artifact cleanup for the stack teardown lifecycle.
 *
 * Three tiers:
 *   'soft'    — docker compose down --remove-orphans + docker image prune -f
 *               (dangling/untagged layers only; named volumes preserved)
 *   'volumes' — soft + docker compose down -v + docker builder prune -f +
 *               docker image prune -af --filter label=com.template-repo.managed=true
 *               (drops pgdata, redisdata, build cache, and managed images)
 *   'nuke'    — volumes + docker system prune -af --volumes
 *               (wipes all docker resources on the host)
 *
 * Reclaimed bytes are parsed from "Total reclaimed space:" lines in prune output.
 */

export type CleanupTier = 'soft' | 'volumes' | 'nuke'

export type PruneResult = {
  tier: CleanupTier
  /** Total bytes reclaimed across all prune commands; 0 if unparseable. */
  reclaimedBytes: number
  /** Human-readable summary, e.g. "Reclaimed: 1.23 GB (soft tier)" */
  summary: string
}

/**
 * Injectable spawn function — captures stdout for reclaimed-bytes parsing.
 * Shape mirrors Bun.spawn with piped output but keeps it mockable in tests.
 */
export type CleanupSpawnFn = (cmd: string[]) => {
  stdout: ReadableStream<Uint8Array> | null
  stderr: ReadableStream<Uint8Array> | null
  exited: Promise<number>
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Parse a "Total reclaimed space: 1.23 GB" line and return bytes. */
export function parseReclaimedLine(line: string): number {
  const match = line.match(/Total reclaimed space:\s+([\d.]+)\s*(B|kB|MB|GB|TB)/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1_000,
    MB: 1_000_000,
    GB: 1_000_000_000,
    TB: 1_000_000_000_000,
  }
  return Math.round(value * (multipliers[unit] ?? 1))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1_000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(2)} kB`
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`
  if (bytes < 1_000_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  return `${(bytes / 1_000_000_000_000).toFixed(2)} TB`
}

async function readStream(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return ''
  const decoder = new TextDecoder()
  let text = ''
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
  return text
}

const defaultSpawnFn: CleanupSpawnFn = (cmd) => {
  // biome-ignore lint/suspicious/noExplicitAny: Bun global not in Node types
  const proc = (globalThis as any).Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    stdout: proc.stdout as ReadableStream<Uint8Array>,
    stderr: proc.stderr as ReadableStream<Uint8Array>,
    exited: proc.exited as Promise<number>,
  }
}

async function runPrune(cmd: string[], spawnFn: CleanupSpawnFn): Promise<number> {
  console.log(`[cleanup] Running: ${cmd.join(' ')}`)
  const proc = spawnFn(cmd)
  const [stdout] = await Promise.all([readStream(proc.stdout), proc.exited])
  let bytes = 0
  for (const line of stdout.split('\n')) {
    bytes += parseReclaimedLine(line)
  }
  return bytes
}

async function defaultConfirm(): Promise<boolean> {
  process.stdout.write(
    '\nWARNING: This will delete ALL Docker resources on this host (images, containers,\n' +
      "volumes, networks) — not just template-repo's. This cannot be undone.\n" +
      'Continue? [y/N]: ',
  )
  return new Promise((resolve) => {
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', (chunk) => {
      const answer = String(chunk).trim().toLowerCase()
      resolve(answer === 'y')
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs docker prune commands for the given cleanup tier.
 *
 * @param tier  'soft' | 'volumes' | 'nuke'
 * @param opts  Injectable deps for testing (spawnFn, force, confirm).
 */
export async function pruneDocker(
  tier: CleanupTier,
  opts: {
    spawnFn?: CleanupSpawnFn
    /** Skip the interactive confirmation prompt (e.g. CI / --force flag). */
    force?: boolean
    /** Override the confirmation prompt for tests. */
    confirm?: () => Promise<boolean>
  } = {},
): Promise<PruneResult> {
  const spawn = opts.spawnFn ?? defaultSpawnFn
  let totalBytes = 0

  // --- Soft commands (all tiers) ---
  totalBytes += await runPrune(['docker', 'compose', 'down', '--remove-orphans'], spawn)
  totalBytes += await runPrune(['docker', 'image', 'prune', '-f'], spawn)

  if (tier === 'volumes' || tier === 'nuke') {
    // --- Volumes-tier additions ---
    totalBytes += await runPrune(['docker', 'compose', 'down', '-v'], spawn)
    totalBytes += await runPrune(['docker', 'builder', 'prune', '-f'], spawn)
    totalBytes += await runPrune(
      ['docker', 'image', 'prune', '-af', '--filter', 'label=com.template-repo.managed=true'],
      spawn,
    )
  }

  if (tier === 'nuke') {
    // --- Nuke confirmation + system prune ---
    const shouldContinue =
      opts.force === true ? true : opts.confirm ? await opts.confirm() : await defaultConfirm()

    if (!shouldContinue) {
      console.log('[cleanup] Aborted. No system prune performed.')
      const summary = `Reclaimed: ${formatBytes(totalBytes)} (${tier} tier — system prune skipped)`
      return { tier, reclaimedBytes: totalBytes, summary }
    }

    totalBytes += await runPrune(['docker', 'system', 'prune', '-af', '--volumes'], spawn)
  }

  const summary = `Reclaimed: ${formatBytes(totalBytes)} (${tier} tier)`
  console.log(`[cleanup] Done. ${summary}`)
  return { tier, reclaimedBytes: totalBytes, summary }
}
