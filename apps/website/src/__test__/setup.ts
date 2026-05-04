/**
 * Vitest global setup for the website package.
 * Stubs browser APIs that jsdom does not implement.
 */

// ResizeObserver is used by Radix UI components (e.g. NavigationMenu, ScrollArea).
// jsdom does not ship it; provide a minimal no-op stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
