/**
 * Tests for the preload IPC bridge (src/preload/index.ts).
 *
 * Strategy:
 *   1. Mock the 'electron' module so contextBridge and ipcRenderer are
 *      vi.fn() stubs — no real Electron process needed.
 *   2. Dynamically import the preload module after mocking so the module
 *      executes and calls contextBridge.exposeInMainWorld at import time.
 *   3. Capture the exposed API object from the mock call and verify each
 *      method delegates to ipcRenderer.invoke with the correct channel,
 *      forwarding the resolved value back to the caller.
 *
 * The preload surface:
 *   window.api.ping()              → ipcRenderer.invoke('bootstrap:ping')
 *   window.api.getBootstrapStatus() → ipcRenderer.invoke('bootstrap:status')
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Electron mock — must be declared before any import of the preload module.
// ---------------------------------------------------------------------------
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the mocked electron module. We re-import it inside each helper so
 * the reference is always fresh (vi.resetModules resets module state but the
 * mock factory itself is stable).
 */
async function getMocks() {
  const electron = await import('electron')
  return {
    exposeInMainWorld: vi.mocked(electron.contextBridge.exposeInMainWorld),
    invoke: vi.mocked(electron.ipcRenderer.invoke),
  }
}

/**
 * Load (or reload) the preload module and return the API object that was
 * passed to contextBridge.exposeInMainWorld as the second argument.
 */
async function loadPreloadAndGetApi() {
  vi.resetModules()
  await import('../index')
  const { exposeInMainWorld } = await getMocks()
  // The preload module calls exposeInMainWorld exactly once.
  const calls = exposeInMainWorld.mock.calls
  const lastCall = calls[calls.length - 1]
  return lastCall[1] as {
    ping: () => Promise<string>
    getBootstrapStatus: () => Promise<unknown>
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preload/index — contextBridge registration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('calls contextBridge.exposeInMainWorld exactly once', async () => {
    await import('../index')
    const { exposeInMainWorld } = await getMocks()
    expect(exposeInMainWorld).toHaveBeenCalledTimes(1)
  })

  it('exposes the API under the name "api"', async () => {
    await import('../index')
    const { exposeInMainWorld } = await getMocks()
    expect(exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object))
  })

  it('exposed API object has exactly the expected method names', async () => {
    await import('../index')
    const { exposeInMainWorld } = await getMocks()
    const [, api] = exposeInMainWorld.mock.calls[0]
    expect(Object.keys(api)).toEqual(expect.arrayContaining(['ping', 'getBootstrapStatus']))
    expect(Object.keys(api)).toHaveLength(2)
  })
})

describe('preload/index — ping()', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('delegates to ipcRenderer.invoke with channel "bootstrap:ping"', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    invoke.mockResolvedValueOnce('pong')

    await api.ping()

    expect(invoke).toHaveBeenCalledWith('bootstrap:ping')
  })

  it('forwards the resolved value from ipcRenderer.invoke', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    invoke.mockResolvedValueOnce('pong')

    const result = await api.ping()

    expect(result).toBe('pong')
  })

  it('propagates rejection from ipcRenderer.invoke', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    invoke.mockRejectedValueOnce(new Error('IPC failure'))

    await expect(api.ping()).rejects.toThrow('IPC failure')
  })
})

describe('preload/index — getBootstrapStatus()', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('delegates to ipcRenderer.invoke with channel "bootstrap:status"', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    const fakeStatus = { env: { VITE_API_URL: true }, buildTimestamp: '2026-01-01T00:00:00Z' }
    invoke.mockResolvedValueOnce(fakeStatus)

    await api.getBootstrapStatus()

    expect(invoke).toHaveBeenCalledWith('bootstrap:status')
  })

  it('forwards the resolved BootstrapStatus from ipcRenderer.invoke', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    const fakeStatus = {
      env: { VITE_API_URL: true, VITE_CLERK_PUBLISHABLE_KEY: false },
      buildTimestamp: undefined,
    }
    invoke.mockResolvedValueOnce(fakeStatus)

    const result = await api.getBootstrapStatus()

    expect(result).toEqual(fakeStatus)
  })

  it('propagates rejection from ipcRenderer.invoke', async () => {
    const api = await loadPreloadAndGetApi()
    const { invoke } = await getMocks()
    invoke.mockRejectedValueOnce(new Error('status IPC failure'))

    await expect(api.getBootstrapStatus()).rejects.toThrow('status IPC failure')
  })
})
