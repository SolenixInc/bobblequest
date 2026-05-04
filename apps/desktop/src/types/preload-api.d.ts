/**
 * Ambient type declarations for the contextBridge surface exposed by
 * apps/desktop/src/preload/index.ts.
 *
 * Augments Window globally so renderer code can access window.api.*
 * with full type safety without needing a direct import of the preload module.
 */

type BootstrapStatus = {
  env: Record<string, boolean>
  buildTimestamp: string | undefined
}

interface Window {
  api: {
    ping(): Promise<string>
    getBootstrapStatus(): Promise<BootstrapStatus>
  }
}
