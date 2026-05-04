import { vi } from 'vitest'

export interface CapturedPostHogCall {
  method: string
  args: unknown[]
}

// Must be hoisted so vi.mock below can reference it at module evaluation time
vi.hoisted(() => {
  void 0 // ensure vi is used so bundlers don't strip hoisting annotation
})

export const capturedPostHogCalls: CapturedPostHogCall[] = []

vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    warning: () => {},
    error: () => {},
  }),
}))

vi.mock('posthog-node', () => ({
  PostHog: class FakePostHog {
    capture = (...args: unknown[]) => {
      capturedPostHogCalls.push({ method: 'capture', args })
    }
    identify = (...args: unknown[]) => {
      capturedPostHogCalls.push({ method: 'identify', args })
    }
    alias = (...args: unknown[]) => {
      capturedPostHogCalls.push({ method: 'alias', args })
    }
    groupIdentify = (...args: unknown[]) => {
      capturedPostHogCalls.push({ method: 'groupIdentify', args })
    }
    isFeatureEnabled = async () => false
    getAllFlags = async () => ({})
    shutdown = async () => {}
  },
}))
