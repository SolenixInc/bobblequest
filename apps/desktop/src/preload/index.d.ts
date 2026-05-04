/**
 * Type declarations for the contextBridge surface exposed by the preload script.
 * Augments `Window` so renderer code can call `window.api.*` with full type safety.
 */
import type { BootstrapStatus } from './index'

declare global {
  interface Window {
    api: {
      ping(): Promise<string>
      getBootstrapStatus(): Promise<BootstrapStatus>
    }
  }
}

export type { BootstrapStatus }
