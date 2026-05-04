/**
 * Preload bridge — exposes a typed `window.api` surface to the renderer.
 *
 * contextIsolation is ON; nodeIntegration is OFF. The only way to cross the
 * boundary is through contextBridge.exposeInMainWorld. Do NOT expose raw
 * ipcRenderer or Node APIs.
 *
 * Current surface:
 *   window.api.ping()              → 'pong'  (IPC liveness check)
 *   window.api.getBootstrapStatus() → BootstrapStatus (env presence + build info)
 */
import { contextBridge, ipcRenderer } from 'electron'

export type BootstrapStatus = {
  env: Record<string, boolean>
  buildTimestamp: string | undefined
}

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('bootstrap:ping'),
  getBootstrapStatus: (): Promise<BootstrapStatus> => ipcRenderer.invoke('bootstrap:status'),
}

contextBridge.exposeInMainWorld('api', api)
