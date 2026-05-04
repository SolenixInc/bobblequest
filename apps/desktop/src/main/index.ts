// Load .env into process.env before anything else.
// electron-vite's main-process bundle is plain Node.js — Vite does NOT
// inject .env vars at runtime (only into the renderer via import.meta.env).
// dotenv.config() is a no-op when vars are already set (production / CI),
// so this is safe to call unconditionally.
import { join, resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: resolve(import.meta.dirname, '../../.env') })

import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { buildContainer, dependencyKeys, getContainer } from './composition'

// Pin userData/sessionData outside OneDrive to prevent Electron cache access
// errors caused by OneDrive file locking (ERROR:cache_util_win.cc access denied).
// Must be called before app.whenReady() and before any module that reads userData.
const appDataDir = join(app.getPath('appData'), 'template-desktop')
app.setPath('userData', appDataDir)
app.setPath('sessionData', appDataDir)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

// IPC: bootstrap:status -- presence-only env snapshot for the renderer bootstrap route.
// Values are NEVER sent across the bridge -- only boolean presence flags.
ipcMain.handle('bootstrap:status', () => {
  const env = process.env
  return {
    env: {
      ENVIRONMENT: Boolean(env.ENVIRONMENT ?? env.NODE_ENV),
      LOG_LEVEL: Boolean(env.LOG_LEVEL),
      PORT: Boolean(env.PORT),
      CLERK_PUBLISHABLE_KEY: Boolean(env.CLERK_PUBLISHABLE_KEY),
      CLERK_SECRET_KEY: Boolean(env.CLERK_SECRET_KEY),
      CLERK_WEBHOOK_SECRET: Boolean(env.CLERK_WEBHOOK_SECRET),
    },
    buildTimestamp: process.env.BUILD_TIMESTAMP,
  }
})

// IPC: bootstrap:ping -- no-op to prove main<->renderer IPC is alive.
ipcMain.handle('bootstrap:ping', () => 'pong')

app.whenReady().then(() => {
  // Boot DI composition root -- validate config before creating any windows.
  // Intentionally no try/catch: a Zod validation error throws here,
  // lands in stderr, and terminates the process. No dialog, no recovery.
  buildContainer()

  const container = getContainer()
  const logger = container.resolve(dependencyKeys.global.LOGGER)

  // Global Error Handlers
  process.on('uncaughtException', (error) => {
    logger.error({
      message: 'uncaught exception in main process',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    dialog.showErrorBox(
      'Fatal Error',
      'An unexpected error occurred in the main process. The application will now close.',
    )
    app.quit()
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({
      message: 'unhandled rejection in main process',
      reason: String(reason),
    })
    dialog.showErrorBox(
      'Fatal Error',
      'An unhandled promise rejection occurred in the main process. The application will now close.',
    )
    app.quit()
  })

  logger.info({
    message: 'desktop main process started',
    electronVersion: process.versions.electron,
    platform: process.platform,
    arch: process.arch,
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Auth is handled entirely by Clerk React SDK in the renderer. Clerk
// client persists its session internally via its headless token cache,
// so the main process no longer needs to bridge session tokens through IPC.
