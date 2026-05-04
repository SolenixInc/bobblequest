/**
 * Unit tests for the stack:full launcher.
 *
 * Covers:
 *   - SERVICES registry shape
 *   - createTeardown kills all subprocess handles
 *   - pollUntilReady returns true on 200, false on timeout
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Service registry shape
// ---------------------------------------------------------------------------

describe('SERVICES registry', () => {
  it('imports without error', async () => {
    const { SERVICES } = await import('../services.ts')
    expect(Array.isArray(SERVICES)).toBe(true)
    expect(SERVICES.length).toBeGreaterThan(0)
  })

  it('every entry has required fields: name, kind', async () => {
    const { SERVICES } = await import('../services.ts')
    for (const svc of SERVICES) {
      expect(typeof svc.name).toBe('string')
      expect(svc.name.length).toBeGreaterThan(0)
      expect(['docker', 'host']).toContain(svc.kind)
    }
  })

  it('host services have a spawn factory', async () => {
    const { SERVICES } = await import('../services.ts')
    const hostServices = SERVICES.filter((s) => s.kind === 'host')
    expect(hostServices.length).toBeGreaterThan(0)
    for (const svc of hostServices) {
      expect(typeof svc.spawn).toBe('function')
    }
  })

  it('docker services have a url', async () => {
    const { SERVICES } = await import('../services.ts')
    const dockerServices = SERVICES.filter((s) => s.kind === 'docker')
    expect(dockerServices.length).toBeGreaterThan(0)
    for (const svc of dockerServices) {
      expect(typeof svc.url).toBe('string')
    }
  })

  it('contains all expected service names', async () => {
    const { SERVICES } = await import('../services.ts')
    const names = SERVICES.map((s) => s.name)
    const expected = ['api', 'web', 'website', 'db', 'redis', 'mobile', 'desktop']
    for (const name of expected) {
      expect(names).toContain(name)
    }
  })

  it('mobile and desktop are host kind', async () => {
    const { SERVICES } = await import('../services.ts')
    const mobile = SERVICES.find((s) => s.name === 'mobile')
    const desktop = SERVICES.find((s) => s.name === 'desktop')
    expect(mobile?.kind).toBe('host')
    expect(desktop?.kind).toBe('host')
  })
})

// ---------------------------------------------------------------------------
// createTeardown — kills all subprocess handles
// ---------------------------------------------------------------------------

describe('createTeardown', () => {
  it('imports without error', async () => {
    const { createTeardown } = await import('../teardown.ts')
    expect(typeof createTeardown).toBe('function')
  })

  it('calls kill on every live subprocess', async () => {
    const { createTeardown } = await import('../teardown.ts')

    // Mock subprocess: alive (exitCode === null) with a kill spy that kills on SIGTERM
    function makeProc() {
      const p = {
        exitCode: null as number | null,
        kill: vi.fn((signal?: number | NodeJS.Signals) => {
          if (signal === 'SIGTERM') {
            p.exitCode = 0
          }
        }),
        exited: Promise.resolve(0),
      }
      return p
    }

    const proc1 = makeProc()
    const proc2 = makeProc()

    // Injectable spawnFn so no Bun global needed
    const mockSpawnFn = vi.fn().mockReturnValue({
      exitCode: 0,
      exited: Promise.resolve(0),
      kill: vi.fn(),
    })

    // Spy on process.exit so the test doesn't actually exit
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error('process.exit called')
    })

    vi.spyOn(console, 'log').mockImplementation(() => {})

    const cleanup = createTeardown([proc1, proc2], {
      skipDocker: true,
      spawnFn: mockSpawnFn,
      killPidFiles: async () => {},
      killOrphanedPorts: async () => {},
    })

    try {
      await cleanup()
    } catch (e) {
      if (!(e instanceof Error && e.message === 'process.exit called')) throw e
    }

    expect(proc1.kill).toHaveBeenCalled()
    expect(proc2.kill).toHaveBeenCalled()

    exitSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('only runs once even if called twice (guard)', async () => {
    const { createTeardown } = await import('../teardown.ts')

    let exitCallCount = 0
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      exitCallCount++
      throw new Error('process.exit called')
    })

    vi.spyOn(console, 'log').mockImplementation(() => {})

    const cleanup = createTeardown([], {
      skipDocker: true,
      killPidFiles: async () => {},
      killOrphanedPorts: async () => {},
    })

    for (let i = 0; i < 2; i++) {
      try {
        await cleanup()
      } catch {}
    }

    // Only one process.exit call regardless of how many times cleanup is invoked
    expect(exitCallCount).toBe(1)

    exitSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('calls cleanupSpawnFn for soft tier commands when cleanupTier is soft', async () => {
    const { createTeardown } = await import('../teardown.ts')

    const spawnCalls: string[][] = []
    const encoder = new TextEncoder()

    // cleanupSpawnFn injectable — matches CleanupSpawnFn shape
    const cleanupSpawnFn = (cmd: string[]) => {
      spawnCalls.push([...cmd])
      return {
        stdout: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(''))
            controller.close()
          },
        }),
        stderr: null,
        exited: Promise.resolve(0),
      }
    }

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error('process.exit called')
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const cleanup = createTeardown([], {
      cleanupTier: 'soft',
      cleanupSpawnFn,
      killPidFiles: async () => {},
      killOrphanedPorts: async () => {},
    })

    try {
      await cleanup()
    } catch (e) {
      if (!(e instanceof Error && e.message === 'process.exit called')) throw e
    }

    // Soft tier runs exactly 2 docker commands
    expect(spawnCalls).toHaveLength(2)
    expect(spawnCalls[0]).toEqual(['docker', 'compose', 'down', '--remove-orphans'])
    expect(spawnCalls[1]).toEqual(['docker', 'image', 'prune', '-f'])

    exitSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('does NOT call the legacy spawnFn when cleanupTier is set', async () => {
    const { createTeardown } = await import('../teardown.ts')

    // This is the OLD spawnFn used for composeDown — it must NOT be called
    const legacySpawnFn = vi.fn().mockReturnValue({
      exitCode: 0,
      exited: Promise.resolve(0),
      kill: vi.fn(),
    })

    const encoder = new TextEncoder()
    const cleanupSpawnFn = (_cmd: string[]) => ({
      stdout: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(''))
          controller.close()
        },
      }),
      stderr: null,
      exited: Promise.resolve(0),
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error('process.exit called')
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const cleanup = createTeardown([], {
      cleanupTier: 'soft',
      spawnFn: legacySpawnFn,
      cleanupSpawnFn,
      killPidFiles: async () => {},
      killOrphanedPorts: async () => {},
    })

    try {
      await cleanup()
    } catch (e) {
      if (!(e instanceof Error && e.message === 'process.exit called')) throw e
    }

    // Legacy spawnFn must NOT have been called — pruneDocker replaced composeDown
    expect(legacySpawnFn).not.toHaveBeenCalled()

    exitSpy.mockRestore()
    vi.restoreAllMocks()
  })
})

// ---------------------------------------------------------------------------
// spawnHostApps — pipeWithPrefix tee wiring (integration smoke test)
// ---------------------------------------------------------------------------

describe('spawnHostApps', () => {
  beforeEach(() => {
    // Clear the module registry so vi.doMock registrations are picked up on
    // the next dynamic import, and don't bleed into other describe blocks.
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('calls pipeWithPrefix twice for mobile and twice for desktop (4 total)', async () => {
    // Fake subprocess handle — stdout/stderr are plain objects (non-null) so
    // asReadable() in launch.ts returns them as-is, and pipeWithPrefix receives
    // them. pipeWithPrefix is fully mocked so it never touches the value.
    const makeFakeProc = () => ({
      stdout: {},
      stderr: {},
      exitCode: null,
      exited: Promise.resolve(0),
      kill: vi.fn(),
    })

    const mobileSpawn = vi.fn(() => makeFakeProc())
    const desktopSpawn = vi.fn(() => makeFakeProc())

    // Mock the stream module — must be registered BEFORE importing launch.ts.
    const pipeWithPrefixMock = vi.fn().mockResolvedValue(undefined)
    vi.doMock('../stream', () => ({
      pipeWithPrefix: pipeWithPrefixMock,
    }))

    // Mock the services registry so no real Bun.spawn fires.
    vi.doMock('../services', () => ({
      SERVICES: [
        { name: 'mobile', kind: 'host', spawn: mobileSpawn },
        { name: 'desktop', kind: 'host', spawn: desktopSpawn },
      ],
    }))

    // Import launch.ts after mocks are registered — this gives us spawnHostApps
    // with pipeWithPrefix already swapped out.
    const { spawnHostApps } = await import('../launch.ts')

    spawnHostApps({ noMobile: false, noDesktop: false })

    // Each host service should tee both stdout and stderr — 2 services × 2 streams = 4 calls.
    expect(pipeWithPrefixMock).toHaveBeenCalledTimes(4)

    // Verify mobile label appears in two of the calls.
    const mobileCalls = pipeWithPrefixMock.mock.calls.filter(
      ([_stream, opts]) => (opts as { label: string }).label === 'mobile',
    )
    expect(mobileCalls).toHaveLength(2)

    // Verify desktop label appears in two of the calls.
    const desktopCalls = pipeWithPrefixMock.mock.calls.filter(
      ([_stream, opts]) => (opts as { label: string }).label === 'desktop',
    )
    expect(desktopCalls).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// pollUntilReady — returns true on 200, false on timeout
// ---------------------------------------------------------------------------

describe('pollUntilReady', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns true immediately when fetch returns 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'text/plain' },
        text: async () => 'ok',
      }),
    )

    const { pollUntilReady } = await import('../health.ts')

    // Covers api target: :3000/bootstrap
    const resultPromise = pollUntilReady('http://localhost:3000/bootstrap', {
      timeoutMs: 5_000,
      intervalMs: 500,
    })

    // Advance time slightly so the first tick resolves
    await vi.runAllTimersAsync()

    const result = await resultPromise
    expect(result).toBe(true)
  })

  it('polls /api/health for web and website targets (no Clerk intercept)', async () => {
    // These URLs mirror what waitForReady uses — web :3001/api/health and website :3002/api/health.
    // Clerk middleware excludes /api/health so these never hit auth and always return 200.
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => '{"ok":true}',
    })
    vi.stubGlobal('fetch', fetchMock)

    const { pollUntilReady } = await import('../health.ts')

    const [webResult, websiteResult] = await Promise.all([
      (async () => {
        const p = pollUntilReady('http://localhost:3001/api/health', {
          timeoutMs: 5_000,
          intervalMs: 500,
        })
        await vi.runAllTimersAsync()
        return p
      })(),
      (async () => {
        const p = pollUntilReady('http://localhost:3002/api/health', {
          timeoutMs: 5_000,
          intervalMs: 500,
        })
        await vi.runAllTimersAsync()
        return p
      })(),
    ])

    expect(webResult).toBe(true)
    expect(websiteResult).toBe(true)

    // Verify the URLs actually polled are the /api/health variants, not /bootstrap
    const calledUrls: string[] = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(calledUrls.some((u) => u.includes('3001/api/health'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('3002/api/health'))).toBe(true)
    expect(calledUrls.every((u) => !u.includes('3001/bootstrap'))).toBe(true)
    expect(calledUrls.every((u) => !u.includes('3002/bootstrap'))).toBe(true)
  })

  it('returns false when all attempts fail before timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const { pollUntilReady } = await import('../health.ts')

    const resultPromise = pollUntilReady('http://localhost:3000/bootstrap', {
      timeoutMs: 2_000,
      intervalMs: 500,
      requestTimeoutMs: 100,
    })

    await vi.runAllTimersAsync()

    const result = await resultPromise
    expect(result).toBe(false)
  })

  it('returns true on first 2xx even after earlier failures', async () => {
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('ECONNREFUSED')
        }
        return {
          status: 200,
          headers: { get: () => 'text/plain' },
          text: async () => 'ok',
        }
      }),
    )

    const { pollUntilReady } = await import('../health.ts')

    const resultPromise = pollUntilReady('http://localhost:3000/bootstrap', {
      timeoutMs: 10_000,
      intervalMs: 200,
      requestTimeoutMs: 500,
    })

    await vi.runAllTimersAsync()

    const result = await resultPromise
    expect(result).toBe(true)
    expect(callCount).toBeGreaterThanOrEqual(3)
  })
})
