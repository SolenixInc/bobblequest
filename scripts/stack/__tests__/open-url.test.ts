/**
 * Unit tests for open-url.ts
 *
 * Covers:
 *   - openCommand returns the correct OS command per platform
 *   - openUrl calls spawnFn with the correct command and resolves on exit 0
 *   - openUrl rejects with a descriptive message on non-zero exit
 *   - openSurfaces iterates all surfaces by default
 *   - openSurfaces respects the --open allowlist (only named surfaces are opened)
 *   - openSurfaces skips entirely when --no-open is simulated via allowlist=[]/noOpen
 *   - openSurfaces skips entirely in CI (process.env.CI set)
 *   - openSurfaces staggers by staggerMs between opens
 *   - openSurfaces does NOT throw when a surface open fails (best-effort)
 *   - Desktop surface: logs "opened" when PID is alive, warning when PID missing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SURFACES,
  type SurfaceName,
  isPidAlive,
  openCommand,
  openSurfaces,
  openUrl,
} from '../open-url.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal fake subprocess that exits with the given code. */
function makeSpawnFn(exitCode: number, stderrText = '') {
  const encoder = new TextEncoder()
  return vi.fn((_cmd: string[], _opts: { stderr: 'pipe' }) => ({
    stderr: stderrText
      ? new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(encoder.encode(stderrText))
            c.close()
          },
        })
      : null,
    exited: Promise.resolve(exitCode),
  }))
}

/** Build an openSurfaces-compatible spawnFn that always succeeds. */
function successSpawnFn() {
  return makeSpawnFn(0)
}

// ---------------------------------------------------------------------------
// openCommand — cross-platform command selection
// ---------------------------------------------------------------------------

describe('openCommand', () => {
  it('returns cmd /c start "" <url> on Windows', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

    const cmd = openCommand('http://localhost:3001')
    expect(cmd).toEqual(['cmd', '/c', 'start', '', 'http://localhost:3001'])

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('returns open <url> on macOS', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

    const cmd = openCommand('http://localhost:3001')
    expect(cmd).toEqual(['open', 'http://localhost:3001'])

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('returns xdg-open <url> on Linux', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })

    const cmd = openCommand('http://localhost:3001')
    expect(cmd).toEqual(['xdg-open', 'http://localhost:3001'])

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })
})

// ---------------------------------------------------------------------------
// openUrl — delegates to spawnFn with correct args
// ---------------------------------------------------------------------------

describe('openUrl', () => {
  it('calls spawnFn with the URL command and resolves on exit 0', async () => {
    const spawnFn = successSpawnFn()
    await expect(openUrl('http://localhost:3001', spawnFn)).resolves.toBeUndefined()
    expect(spawnFn).toHaveBeenCalledOnce()
    // Verify the URL appears in the args passed to spawnFn
    const [args] = spawnFn.mock.calls[0] as [string[], unknown]
    expect(args).toContain('http://localhost:3001')
  })

  it('rejects with a descriptive error on non-zero exit code', async () => {
    const spawnFn = makeSpawnFn(1, 'Command not found')
    await expect(openUrl('http://localhost:3001', spawnFn)).rejects.toThrow('openUrl failed')
    await expect(openUrl('http://localhost:3001', spawnFn)).rejects.toThrow('http://localhost:3001')
  })

  it('resolves when exit code is null (process detached and exit code unknown)', async () => {
    const spawnFn = makeSpawnFn(null as unknown as number)
    await expect(openUrl('http://localhost:3001', spawnFn)).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — default (all surfaces)
// ---------------------------------------------------------------------------

describe('openSurfaces — default all surfaces', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.CI
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens all URL surfaces when no allowlist is provided', async () => {
    const spawnFn = successSpawnFn()
    const fakeReadDesktopPid = () => 12345
    vi.spyOn(process, 'kill').mockReturnValue(true as unknown as undefined) // PID alive

    const results = await openSurfaces({
      spawnFn,
      readDesktopPid: fakeReadDesktopPid,
      staggerMs: 0,
    })

    // 4 URL surfaces + 1 desktop = 5 total
    expect(results).toHaveLength(SURFACES.length)

    // All URL surfaces succeeded
    const urlResults = results.filter((r) => r.surface !== 'desktop')
    for (const r of urlResults) {
      expect(r.ok).toBe(true)
    }

    // Desktop succeeded (PID alive)
    const desktopResult = results.find((r) => r.surface === 'desktop')
    expect(desktopResult?.ok).toBe(true)
  })

  it('calls spawnFn once per URL surface', async () => {
    const spawnFn = successSpawnFn()
    vi.spyOn(process, 'kill').mockReturnValue(true as unknown as undefined)

    await openSurfaces({
      spawnFn,
      readDesktopPid: () => 99,
      staggerMs: 0,
    })

    const urlSurfaces = SURFACES.filter((s) => s.url !== undefined)
    expect(spawnFn).toHaveBeenCalledTimes(urlSurfaces.length)
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — --open allowlist
// ---------------------------------------------------------------------------

describe('openSurfaces — allowlist', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.CI
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens only the surfaces in the allowlist (web + api)', async () => {
    const spawnFn = successSpawnFn()
    const allowlist: SurfaceName[] = ['web', 'api']

    const results = await openSurfaces({
      spawnFn,
      allowlist,
      staggerMs: 0,
    })

    expect(results).toHaveLength(2)
    const names = results.map((r) => r.surface)
    expect(names).toContain('web')
    expect(names).toContain('api')
    expect(names).not.toContain('website')
    expect(names).not.toContain('mobile')
    expect(names).not.toContain('desktop')
  })

  it('opens only website + api for --open=website,api', async () => {
    const spawnFn = successSpawnFn()
    const allowlist: SurfaceName[] = ['website', 'api']

    const results = await openSurfaces({
      spawnFn,
      allowlist,
      staggerMs: 0,
    })

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.surface)).toEqual(['website', 'api'])
  })

  it('returns empty results when allowlist is empty', async () => {
    const spawnFn = successSpawnFn()

    const results = await openSurfaces({
      spawnFn,
      allowlist: [],
      staggerMs: 0,
    })

    expect(results).toHaveLength(0)
    expect(spawnFn).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — CI guard
// ---------------------------------------------------------------------------

describe('openSurfaces — CI guard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CI
  })

  it('skips all opens when process.env.CI is set', async () => {
    process.env.CI = 'true'
    const spawnFn = successSpawnFn()

    const results = await openSurfaces({ spawnFn, staggerMs: 0 })

    expect(results).toHaveLength(0)
    expect(spawnFn).not.toHaveBeenCalled()
  })

  it('skips when CI=1', async () => {
    process.env.CI = '1'
    const spawnFn = successSpawnFn()

    const results = await openSurfaces({ spawnFn, staggerMs: 0 })

    expect(results).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — stagger timing
// ---------------------------------------------------------------------------

describe('openSurfaces — stagger timing', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.CI
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('delays staggerMs between each surface open', async () => {
    const callTimestamps: number[] = []

    // Each spawnFn call records the current (mocked) time.
    const timedSpawnFn = vi.fn((_cmd: string[], _opts: { stderr: 'pipe' }) => {
      callTimestamps.push(Date.now())
      return {
        stderr: null,
        exited: Promise.resolve(0),
      }
    })

    const staggerMs = 200
    // Run only two URL surfaces to keep the test simple.
    const allowlist: SurfaceName[] = ['website', 'web']

    const resultPromise = openSurfaces({
      spawnFn: timedSpawnFn,
      allowlist,
      staggerMs,
      readDesktopPid: () => null,
    })

    // Advance through all timers so the stagger delays fire.
    await vi.runAllTimersAsync()
    await resultPromise

    expect(callTimestamps).toHaveLength(2)
    // Second call must be at least staggerMs after the first.
    expect(callTimestamps[1] - callTimestamps[0]).toBeGreaterThanOrEqual(staggerMs)
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — failure is non-fatal
// ---------------------------------------------------------------------------

describe('openSurfaces — failure tolerance', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.CI
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('continues to the next surface when one open fails', async () => {
    let callCount = 0
    const mixedSpawnFn = vi.fn((_cmd: string[], _opts: { stderr: 'pipe' }) => {
      callCount++
      const failThisOne = callCount === 1
      return {
        stderr: null,
        exited: Promise.resolve(failThisOne ? 1 : 0),
      }
    })

    const allowlist: SurfaceName[] = ['website', 'web']

    const results = await openSurfaces({
      spawnFn: mixedSpawnFn,
      allowlist,
      staggerMs: 0,
    })

    // Both surfaces were attempted
    expect(results).toHaveLength(2)
    // First failed, second succeeded
    expect(results[0].ok).toBe(false)
    expect(results[1].ok).toBe(true)
  })

  it('returns ok=false with a message when a surface fails', async () => {
    const failSpawnFn = makeSpawnFn(127, 'command not found')

    const results = await openSurfaces({
      spawnFn: failSpawnFn,
      allowlist: ['web'],
      staggerMs: 0,
    })

    expect(results[0].ok).toBe(false)
    expect(results[0].message).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// openSurfaces — desktop surface
// ---------------------------------------------------------------------------

describe('openSurfaces — desktop surface', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.CI
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok=true when desktop PID is alive', async () => {
    const spawnFn = successSpawnFn()
    vi.spyOn(process, 'kill').mockReturnValue(true as unknown as undefined) // PID 9999 alive

    const results = await openSurfaces({
      spawnFn,
      allowlist: ['desktop'],
      readDesktopPid: () => 9999,
      staggerMs: 0,
    })

    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
    // spawnFn must NOT have been called for desktop (no URL to open)
    expect(spawnFn).not.toHaveBeenCalled()
  })

  it('returns ok=false when desktop PID file is absent', async () => {
    const spawnFn = successSpawnFn()

    const results = await openSurfaces({
      spawnFn,
      allowlist: ['desktop'],
      readDesktopPid: () => null, // no PID file
      staggerMs: 0,
    })

    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(false)
    expect(results[0].message).toMatch(/no PID file/)
  })

  it('returns ok=false when desktop PID is present but process is dead', async () => {
    const spawnFn = successSpawnFn()
    vi.spyOn(process, 'kill').mockImplementation((_pid, sig) => {
      if (sig === 0) throw new Error('ESRCH')
      return true as unknown as undefined
    })

    const results = await openSurfaces({
      spawnFn,
      allowlist: ['desktop'],
      readDesktopPid: () => 7777,
      staggerMs: 0,
    })

    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(false)
    expect(results[0].message).toMatch(/not alive/)
  })
})

// ---------------------------------------------------------------------------
// isPidAlive — unit
// ---------------------------------------------------------------------------

describe('isPidAlive', () => {
  it('returns true for the current process PID', () => {
    expect(isPidAlive(process.pid)).toBe(true)
  })

  it('returns false for an obviously invalid PID', () => {
    // PID 999999999 is virtually guaranteed to not exist.
    expect(isPidAlive(999_999_999)).toBe(false)
  })
})
