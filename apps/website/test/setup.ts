import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Shim ResizeObserver for jsdom environments that don't provide it.
// Guard on typeof window to avoid crashing in @vitest-environment node tests
// that still execute this setup file. Guard on ResizeObserver presence to avoid
// "Cannot redefine property" errors on jsdom versions that already ship it.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  })
}
