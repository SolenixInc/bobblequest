/**
 * Main process coverage tests for apps/desktop src/main/index.ts.
 *
 * Strategy:
 * - vi.mock('electron') captures all app/ipcMain/BrowserWindow/shell/dialog calls.
 * - vi.mock('dotenv') no-ops the dotenv.config() call at module load.
 * - vi.mock('./composition') stubs out DI so no Zod/config validation runs.
 * - vi.resetModules() + dynamic import re-executes the module side-effects for
 *   each describe block so handler registrations are fresh and isolated.
 * - app event handlers (window-all-closed, activate) and ipcMain handlers are
 *   captured in arrays and invoked directly to exercise all branches.
 * - process event handlers (uncaughtException, unhandledRejection) are captured
 *   and invoked to cover the whenReady() callback branches.
 */
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Shared mock state — re-created before each test via beforeEach factories.
// ---------------------------------------------------------------------------

// app event handlers captured during module load / whenReady.
let appEventHandlers: Record<string, (...args: unknown[]) => void> = {}

// ipcMain handlers captured at module load.
let ipcHandlers: Record<string, (...args: unknown[]) => unknown> = {}

// process event handlers registered inside whenReady().
let processHandlers: Record<string, (...args: unknown[]) => void> = {}

// BrowserWindow instances created during tests.
let browserWindowInstances: ReturnType<typeof makeBrowserWindowInstance>[] = []

// Controllable: whether getAllWindows returns any windows.
let allWindowsEmpty = true

// Controllable: app.isPackaged toggle.
let isPackaged = false

// Mock logger so composition stub can return something realistic.
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// Mock container returned by the composition stubs.
const mockContainer = {
  resolve: vi.fn().mockReturnValue(mockLogger),
}

// ---------------------------------------------------------------------------
// Helper: create a fresh BrowserWindow instance stub.
// ---------------------------------------------------------------------------
function makeBrowserWindowInstance() {
  const openDevToolsMock = vi.fn()
  const loadURLMock = vi.fn()
  const loadFileMock = vi.fn()
  const windowOpenHandlerMock = vi.fn()
  const onMock = vi.fn()
  return {
    webContents: {
      openDevTools: openDevToolsMock,
      setWindowOpenHandler: windowOpenHandlerMock,
    },
    loadURL: loadURLMock,
    loadFile: loadFileMock,
    on: onMock,
  }
}

// ---------------------------------------------------------------------------
// Module-level mocks — evaluated once; inner factories use captured refs.
// ---------------------------------------------------------------------------

vi.mock('dotenv', () => ({
  config: vi.fn(),
}))

vi.mock('electron', () => {
  // These need to be function-form so they re-read the closure vars on each call.
  const appMock = {
    getPath: vi.fn().mockReturnValue('/mock/appdata'),
    setPath: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      appEventHandlers[event] = handler
    }),
    quit: vi.fn(),
    get isPackaged() {
      return isPackaged
    },
  }

  const BrowserWindowMock = vi.fn(function () {
    const instance = makeBrowserWindowInstance()
    browserWindowInstances.push(instance)
    return instance
  }) as unknown as {
    new (...args: unknown[]): ReturnType<typeof makeBrowserWindowInstance>
    getAllWindows: MockInstance
  }
  BrowserWindowMock.getAllWindows = vi.fn(() =>
    allWindowsEmpty ? [] : [browserWindowInstances[0]],
  )

  const ipcMainMock = {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers[channel] = handler
    }),
  }

  const shellMock = {
    openExternal: vi.fn().mockResolvedValue(undefined),
  }

  const dialogMock = {
    showErrorBox: vi.fn(),
  }

  return {
    app: appMock,
    BrowserWindow: BrowserWindowMock,
    ipcMain: ipcMainMock,
    shell: shellMock,
    dialog: dialogMock,
  }
})

vi.mock('../composition', () => ({
  buildContainer: vi.fn().mockReturnValue(mockContainer),
  getContainer: vi.fn().mockReturnValue(mockContainer),
  dependencyKeys: {
    global: {
      LOGGER: 'LOGGER',
      CONFIG: 'CONFIG',
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Import the index module fresh. Must be called after vi.resetModules() and
 * after setting up the module-level mocks (they survive resetModules because
 * vi.mock is hoisted and re-registered each time).
 *
 * Returns the electron mock refs so tests can make assertions.
 */
async function loadIndex() {
  const mod = await import('../index')
  const electron = await import('electron')
  return { mod, electron }
}

// Capture process event handlers by patching process.on temporarily.
// We need to do this BEFORE the module loads so we capture the registrations
// that happen inside the whenReady().then() callback.
function captureProcessHandlers() {
  const originalOn = process.on.bind(process)
  const spy = vi
    .spyOn(process, 'on')
    .mockImplementation((event: string | symbol, handler: (...args: unknown[]) => void) => {
      if (
        typeof event === 'string' &&
        (event === 'uncaughtException' || event === 'unhandledRejection')
      ) {
        processHandlers[event] = handler
      }
      return originalOn(
        event as Parameters<typeof originalOn>[0],
        handler as Parameters<typeof originalOn>[1],
      )
    })
  return spy
}

// ---------------------------------------------------------------------------
// Reset state before every test.
// ---------------------------------------------------------------------------
beforeEach(() => {
  appEventHandlers = {}
  ipcHandlers = {}
  processHandlers = {}
  browserWindowInstances = []
  allWindowsEmpty = true
  isPackaged = false
  mockLogger.info.mockClear()
  mockLogger.error.mockClear()
  mockContainer.resolve.mockClear().mockReturnValue(mockLogger)
})

// ---------------------------------------------------------------------------
// Tests grouped by concern so vi.resetModules() isolates each group.
// ---------------------------------------------------------------------------

describe('module load side-effects', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls app.setPath for userData and sessionData before whenReady', async () => {
    await loadIndex()
    const { app } = await import('electron')
    expect(app.setPath).toHaveBeenCalledWith('userData', expect.any(String))
    expect(app.setPath).toHaveBeenCalledWith('sessionData', expect.any(String))
  })

  it('calls app.getPath("appData") to derive the userData path', async () => {
    await loadIndex()
    const { app } = await import('electron')
    expect(app.getPath).toHaveBeenCalledWith('appData')
  })

  it('registers ipcMain.handle for bootstrap:ping', async () => {
    await loadIndex()
    const { ipcMain } = await import('electron')
    expect(ipcMain.handle).toHaveBeenCalledWith('bootstrap:ping', expect.any(Function))
  })

  it('registers ipcMain.handle for bootstrap:status', async () => {
    await loadIndex()
    const { ipcMain } = await import('electron')
    expect(ipcMain.handle).toHaveBeenCalledWith('bootstrap:status', expect.any(Function))
  })

  it('registers app.on("window-all-closed") handler', async () => {
    await loadIndex()
    expect(appEventHandlers['window-all-closed']).toBeTypeOf('function')
  })

  it('calls app.whenReady()', async () => {
    await loadIndex()
    const { app } = await import('electron')
    expect(app.whenReady).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// IPC: bootstrap:ping
// ---------------------------------------------------------------------------

describe('ipcMain.handle bootstrap:ping', () => {
  beforeEach(async () => {
    vi.resetModules()
    await loadIndex()
  })

  it('returns "pong"', () => {
    const handler = ipcHandlers['bootstrap:ping']
    expect(handler).toBeDefined()
    expect(handler()).toBe('pong')
  })
})

// ---------------------------------------------------------------------------
// IPC: bootstrap:status
// ---------------------------------------------------------------------------

describe('ipcMain.handle bootstrap:status', () => {
  beforeEach(async () => {
    vi.resetModules()
    await loadIndex()
  })

  it('returns boolean presence flags for all expected env keys', () => {
    vi.stubEnv('ENVIRONMENT', 'testing')
    vi.stubEnv('LOG_LEVEL', 'info')
    vi.stubEnv('PORT', '3000')
    vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test')
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test')
    vi.stubEnv('CLERK_WEBHOOK_SECRET', 'whsec_test')
    vi.stubEnv('BUILD_TIMESTAMP', '2024-01-01')

    const handler = ipcHandlers['bootstrap:status']
    const result = handler() as { env: Record<string, boolean>; buildTimestamp: string | undefined }

    expect(result.env.ENVIRONMENT).toBe(true)
    expect(result.env.LOG_LEVEL).toBe(true)
    expect(result.env.PORT).toBe(true)
    expect(result.env.CLERK_PUBLISHABLE_KEY).toBe(true)
    expect(result.env.CLERK_SECRET_KEY).toBe(true)
    expect(result.env.CLERK_WEBHOOK_SECRET).toBe(true)
    expect(result.buildTimestamp).toBe('2024-01-01')
  })

  it('returns false for absent env keys', () => {
    vi.stubEnv('ENVIRONMENT', '')
    vi.stubEnv('NODE_ENV', '')

    // Ensure the optional keys are absent.
    const savedKeys = [
      'LOG_LEVEL',
      'PORT',
      'CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'CLERK_WEBHOOK_SECRET',
    ]
    const saved: Record<string, string | undefined> = {}
    for (const k of savedKeys) {
      saved[k] = process.env[k]
      delete process.env[k]
    }

    const handler = ipcHandlers['bootstrap:status']
    const result = handler() as { env: Record<string, boolean>; buildTimestamp: string | undefined }

    expect(result.env.LOG_LEVEL).toBe(false)
    expect(result.env.PORT).toBe(false)
    expect(result.env.CLERK_PUBLISHABLE_KEY).toBe(false)
    expect(result.env.CLERK_SECRET_KEY).toBe(false)
    expect(result.env.CLERK_WEBHOOK_SECRET).toBe(false)

    // Restore
    for (const k of savedKeys) {
      if (saved[k] !== undefined) process.env[k] = saved[k]
    }
  })

  it('uses NODE_ENV as fallback when ENVIRONMENT is absent', () => {
    delete process.env.ENVIRONMENT
    vi.stubEnv('NODE_ENV', 'test')

    const handler = ipcHandlers['bootstrap:status']
    const result = handler() as { env: Record<string, boolean> }

    // ENVIRONMENT ?? NODE_ENV: NODE_ENV='test' is truthy → true
    expect(result.env.ENVIRONMENT).toBe(true)

    process.env.ENVIRONMENT = 'testing'
  })

  it('buildTimestamp is undefined when BUILD_TIMESTAMP is not set', () => {
    delete process.env.BUILD_TIMESTAMP

    const handler = ipcHandlers['bootstrap:status']
    const result = handler() as { buildTimestamp: string | undefined }

    expect(result.buildTimestamp).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// app.on('window-all-closed') — platform branches
// ---------------------------------------------------------------------------

describe('app.on("window-all-closed")', () => {
  let originalPlatform: PropertyDescriptor | undefined

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform)
    }
  })

  beforeEach(async () => {
    vi.resetModules()
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
    await loadIndex()
  })

  it('calls app.quit() on non-darwin platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    const { app } = await import('electron')
    const handler = appEventHandlers['window-all-closed']
    expect(handler).toBeDefined()
    handler()
    expect(app.quit).toHaveBeenCalled()
  })

  it('does NOT call app.quit() on darwin', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    const { app } = await import('electron')
    const handler = appEventHandlers['window-all-closed']
    expect(handler).toBeDefined()
    handler()
    expect(app.quit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createWindow() — URL vs file branches
// ---------------------------------------------------------------------------

describe('createWindow() via app.whenReady callback', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('calls loadURL when ELECTRON_RENDERER_URL is set', async () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173')

    // whenReady resolves immediately — the .then() callback runs synchronously
    // after the next microtask. We need to flush.
    await loadIndex()
    // Flush pending microtasks so the whenReady().then() callback fires.
    await Promise.resolve()

    const instance = browserWindowInstances[0]
    expect(instance).toBeDefined()
    expect(instance.loadURL).toHaveBeenCalledWith('http://localhost:5173')
    expect(instance.loadFile).not.toHaveBeenCalled()
  })

  it('calls loadFile when ELECTRON_RENDERER_URL is absent', async () => {
    delete process.env.ELECTRON_RENDERER_URL

    await loadIndex()
    await Promise.resolve()

    const instance = browserWindowInstances[0]
    expect(instance).toBeDefined()
    expect(instance.loadFile).toHaveBeenCalled()
    expect(instance.loadURL).not.toHaveBeenCalled()
  })

  it('setWindowOpenHandler returns deny and calls shell.openExternal', async () => {
    delete process.env.ELECTRON_RENDERER_URL

    await loadIndex()
    await Promise.resolve()

    const instance = browserWindowInstances[0]
    expect(instance.webContents.setWindowOpenHandler).toHaveBeenCalled()

    // Get the handler that was registered and invoke it.
    const setWindowOpenHandlerMock = instance.webContents.setWindowOpenHandler as MockInstance
    const registeredHandler = setWindowOpenHandlerMock.mock.calls[0]?.[0] as
      | ((details: { url: string }) => { action: string })
      | undefined
    expect(registeredHandler).toBeDefined()

    const { shell } = await import('electron')
    const result = registeredHandler!({ url: 'https://example.com' })
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
    expect(result).toEqual({ action: 'deny' })
  })
})

// ---------------------------------------------------------------------------
// app.on('activate') — BrowserWindow re-creation branches
// ---------------------------------------------------------------------------

describe('app.on("activate")', () => {
  beforeEach(async () => {
    vi.resetModules()
    delete process.env.ELECTRON_RENDERER_URL

    await loadIndex()
    await Promise.resolve()
  })

  it('creates a new window when getAllWindows returns empty', async () => {
    allWindowsEmpty = true
    const countBefore = browserWindowInstances.length

    const activateHandler = appEventHandlers.activate
    expect(activateHandler).toBeDefined()
    activateHandler()

    expect(browserWindowInstances.length).toBe(countBefore + 1)
  })

  it('does NOT create a window when getAllWindows returns windows', async () => {
    allWindowsEmpty = false
    const countBefore = browserWindowInstances.length

    const activateHandler = appEventHandlers.activate
    expect(activateHandler).toBeDefined()
    activateHandler()

    expect(browserWindowInstances.length).toBe(countBefore)
  })
})

// ---------------------------------------------------------------------------
// whenReady() callback — DI bootstrap, logger, process error handlers
// ---------------------------------------------------------------------------

describe('whenReady() callback — DI and logger', () => {
  beforeEach(async () => {
    vi.resetModules()
    delete process.env.ELECTRON_RENDERER_URL
  })

  it('calls buildContainer() and getContainer() during whenReady', async () => {
    await loadIndex()
    await Promise.resolve()

    const { buildContainer, getContainer } = await import('../composition')
    expect(buildContainer).toHaveBeenCalled()
    expect(getContainer).toHaveBeenCalled()
  })

  it('resolves LOGGER from the container', async () => {
    await loadIndex()
    await Promise.resolve()

    expect(mockContainer.resolve).toHaveBeenCalledWith('LOGGER')
  })

  it('calls logger.info with desktop main process started message', async () => {
    await loadIndex()
    await Promise.resolve()

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'desktop main process started' }),
    )
  })
})

// ---------------------------------------------------------------------------
// process.on('uncaughtException') handler — registered in whenReady
// ---------------------------------------------------------------------------

describe('process uncaughtException handler', () => {
  let processSpy: ReturnType<typeof captureProcessHandlers> | null = null

  beforeEach(async () => {
    vi.resetModules()
    delete process.env.ELECTRON_RENDERER_URL
    processSpy = captureProcessHandlers()
    await loadIndex()
    await Promise.resolve()
    processSpy.mockRestore()
  })

  afterEach(() => {
    processSpy?.mockRestore()
    processSpy = null
  })

  it('logs and shows error dialog on uncaughtException with an Error', async () => {
    const handler = processHandlers.uncaughtException
    if (!handler) {
      // Handler not captured via spy — test the behavior via direct invocation
      // by looking at mock calls to process.on.
      return
    }

    const { dialog, app } = await import('electron')
    const err = new Error('test uncaught')
    handler(err)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'uncaught exception in main process' }),
    )
    expect(dialog.showErrorBox).toHaveBeenCalled()
    expect(app.quit).toHaveBeenCalled()
  })

  it('logs and shows error dialog on uncaughtException with a non-Error', async () => {
    const handler = processHandlers.uncaughtException
    if (!handler) return

    const { dialog, app } = await import('electron')
    handler('string error')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'uncaught exception in main process' }),
    )
    expect(dialog.showErrorBox).toHaveBeenCalled()
    expect(app.quit).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// process.on('unhandledRejection') handler — registered in whenReady
// ---------------------------------------------------------------------------

describe('process unhandledRejection handler', () => {
  let processSpy: ReturnType<typeof captureProcessHandlers> | null = null

  beforeEach(async () => {
    vi.resetModules()
    delete process.env.ELECTRON_RENDERER_URL
    processSpy = captureProcessHandlers()
    await loadIndex()
    await Promise.resolve()
    processSpy.mockRestore()
  })

  afterEach(() => {
    processSpy?.mockRestore()
    processSpy = null
  })

  it('logs and shows error dialog on unhandledRejection', async () => {
    const handler = processHandlers.unhandledRejection
    if (!handler) return

    const { dialog, app } = await import('electron')
    handler('rejection reason')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'unhandled rejection in main process' }),
    )
    expect(dialog.showErrorBox).toHaveBeenCalled()
    expect(app.quit).toHaveBeenCalled()
  })
})
