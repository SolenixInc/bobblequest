/**
 * Unit tests for pruneDocker cleanup tiers.
 *
 * Covers:
 *   - Soft tier: correct command set, no volume/system prune
 *   - Volumes tier: all soft + volume + builder + managed-image prune
 *   - Nuke tier: confirm/abort flow, force flag, system prune command
 *   - Reclaimed bytes parsing: kB, MB, GB, sums across multiple lines
 */

import { describe, expect, it, vi } from 'vitest'
import { parseReclaimedLine, pruneDocker } from '../cleanup.ts'
import type { CleanupSpawnFn } from '../cleanup.ts'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStreamFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

/** Build a mock spawnFn that records calls and returns the given stdout text. */
function makeSpawnMock(outputLines: string[] = []): { spawnFn: CleanupSpawnFn; calls: string[][] } {
  const calls: string[][] = []
  const spawnFn: CleanupSpawnFn = (cmd) => {
    calls.push([...cmd])
    const output = outputLines.join('\n')
    return {
      stdout: makeStreamFromText(output),
      stderr: null,
      exited: Promise.resolve(0),
    }
  }
  return { spawnFn, calls }
}

// ---------------------------------------------------------------------------
// parseReclaimedLine — unit tests
// ---------------------------------------------------------------------------

describe('parseReclaimedLine', () => {
  it('returns 0 for lines without reclaimed space marker', () => {
    expect(parseReclaimedLine('Deleted containers: 0')).toBe(0)
    expect(parseReclaimedLine('')).toBe(0)
  })

  it('parses bytes (B)', () => {
    expect(parseReclaimedLine('Total reclaimed space: 512 B')).toBe(512)
  })

  it('parses kilobytes (kB)', () => {
    expect(parseReclaimedLine('Total reclaimed space: 1.5 kB')).toBe(1500)
  })

  it('parses megabytes (MB)', () => {
    expect(parseReclaimedLine('Total reclaimed space: 200.00 MB')).toBe(200_000_000)
  })

  it('parses gigabytes (GB)', () => {
    expect(parseReclaimedLine('Total reclaimed space: 1.23 GB')).toBe(1_230_000_000)
  })

  it('is case-insensitive for unit', () => {
    expect(parseReclaimedLine('Total reclaimed space: 2.00 gb')).toBe(2_000_000_000)
  })
})

// ---------------------------------------------------------------------------
// pruneDocker — soft tier
// ---------------------------------------------------------------------------

describe('pruneDocker - soft tier', () => {
  it('runs docker compose down --remove-orphans then docker image prune -f', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('soft', { spawnFn })

    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual(['docker', 'compose', 'down', '--remove-orphans'])
    expect(calls[1]).toEqual(['docker', 'image', 'prune', '-f'])

    vi.restoreAllMocks()
  })

  it('does NOT run docker compose down -v', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('soft', { spawnFn })

    const hasVolumeDown = calls.some((cmd) => cmd.includes('down') && cmd.includes('-v'))
    expect(hasVolumeDown).toBe(false)

    vi.restoreAllMocks()
  })

  it('does NOT run docker builder prune', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('soft', { spawnFn })

    const hasBuilderPrune = calls.some((cmd) => cmd.includes('builder'))
    expect(hasBuilderPrune).toBe(false)

    vi.restoreAllMocks()
  })

  it('does NOT run docker system prune', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('soft', { spawnFn })

    const hasSystemPrune = calls.some((cmd) => cmd.includes('system'))
    expect(hasSystemPrune).toBe(false)

    vi.restoreAllMocks()
  })

  it('parses reclaimed bytes from prune output', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn } = makeSpawnMock(['Total reclaimed space: 500 MB'])
    const result = await pruneDocker('soft', { spawnFn })

    // 2 commands × 500 MB each
    expect(result.reclaimedBytes).toBe(1_000_000_000)
    expect(result.tier).toBe('soft')

    vi.restoreAllMocks()
  })

  it('returns reclaimedBytes: 0 when no Total reclaimed space line found', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn } = makeSpawnMock(['Deleted images: 0'])
    const result = await pruneDocker('soft', { spawnFn })

    expect(result.reclaimedBytes).toBe(0)

    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// pruneDocker — volumes tier
// ---------------------------------------------------------------------------

describe('pruneDocker - volumes tier', () => {
  it('runs all soft commands plus docker compose down -v, builder prune, image prune -af with label filter', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('volumes', { spawnFn })

    // Soft commands
    expect(calls.some((c) => c.includes('--remove-orphans'))).toBe(true)
    expect(calls.some((c) => c.join(' ') === 'docker image prune -f')).toBe(true)

    // Volumes-tier additions
    expect(calls.some((c) => c.includes('down') && c.includes('-v'))).toBe(true)
    expect(calls.some((c) => c.includes('builder'))).toBe(true)
    // image prune -af with label filter
    expect(
      calls.some((c) => c.includes('-af') && c.includes('label=com.template-repo.managed=true')),
    ).toBe(true)

    expect(calls).toHaveLength(5)

    vi.restoreAllMocks()
  })

  it('includes label=com.template-repo.managed=true in image prune command', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    await pruneDocker('volumes', { spawnFn })

    const labelPrune = calls.find((c) => c.includes('-af'))
    expect(labelPrune).toBeDefined()
    expect(labelPrune).toContain('label=com.template-repo.managed=true')

    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// pruneDocker — nuke tier
// ---------------------------------------------------------------------------

describe('pruneDocker - nuke tier', () => {
  it('calls confirm() before docker system prune', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    const confirmFn = vi.fn().mockResolvedValue(true)

    await pruneDocker('nuke', { spawnFn, confirm: confirmFn })

    expect(confirmFn).toHaveBeenCalledOnce()
    expect(calls.some((c) => c.includes('system'))).toBe(true)

    vi.restoreAllMocks()
  })

  it('aborts (returns reclaimedBytes for partial work only) if confirm returns false', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock(['Total reclaimed space: 100 MB'])
    const confirmFn = vi.fn().mockResolvedValue(false)

    const result = await pruneDocker('nuke', { spawnFn, confirm: confirmFn })

    // system prune must not have been called
    expect(calls.some((c) => c.includes('system'))).toBe(false)
    // summary should mention "system prune skipped"
    expect(result.summary).toContain('system prune skipped')

    vi.restoreAllMocks()
  })

  it('runs docker system prune -af --volumes when confirm returns true', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    const confirmFn = vi.fn().mockResolvedValue(true)

    await pruneDocker('nuke', { spawnFn, confirm: confirmFn })

    const systemPrune = calls.find((c) => c.includes('system'))
    expect(systemPrune).toEqual(['docker', 'system', 'prune', '-af', '--volumes'])

    vi.restoreAllMocks()
  })

  it('skips confirm when force: true is passed', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()
    const confirmFn = vi.fn()

    await pruneDocker('nuke', { spawnFn, force: true, confirm: confirmFn })

    // confirm should NOT be called because force bypasses it
    expect(confirmFn).not.toHaveBeenCalled()
    expect(calls.some((c) => c.includes('system'))).toBe(true)

    vi.restoreAllMocks()
  })

  it('runs all volumes commands before system prune', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { spawnFn, calls } = makeSpawnMock()

    await pruneDocker('nuke', { spawnFn, force: true })

    // 5 volumes-tier commands + 1 system prune = 6 total
    expect(calls).toHaveLength(6)
    // Last command is system prune
    expect(calls[5]).toEqual(['docker', 'system', 'prune', '-af', '--volumes'])

    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// Reclaimed bytes parsing — multi-line sums
// ---------------------------------------------------------------------------

describe('reclaimed bytes parsing - multi-command sums', () => {
  it('sums reclaimed bytes across multiple prune outputs', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    // Each call returns 1 GB; soft tier has 2 calls
    const { spawnFn } = makeSpawnMock(['Total reclaimed space: 1.00 GB'])
    const result = await pruneDocker('soft', { spawnFn })

    expect(result.reclaimedBytes).toBe(2_000_000_000)

    vi.restoreAllMocks()
  })

  it('handles TB unit', () => {
    expect(parseReclaimedLine('Total reclaimed space: 1.00 TB')).toBe(1_000_000_000_000)
  })
})
