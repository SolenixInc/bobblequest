// Set up minimal environment variables for desktop tests.
// These are required by DesktopClientConfigSchema used in the renderer.
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_123'
process.env.VITE_API_URL = 'http://localhost:3000/trpc'
process.env.ENVIRONMENT = 'testing'

import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Shim matchMedia — jsdom does not implement it; renderer components that
// call window.matchMedia (e.g. media-query hooks) would otherwise throw.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Shim IntersectionObserver — jsdom does not implement it; components that
// use intersection-based visibility logic would otherwise throw.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverStub,
})
