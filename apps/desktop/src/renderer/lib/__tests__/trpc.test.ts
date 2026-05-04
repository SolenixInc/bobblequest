/**
 * Tests for the tRPC client factory module.
 *
 * Verifies the exported `trpc` object is a non-null tRPC React proxy
 * produced by createTRPCReact. We mock @trpc/react-query so the test
 * never needs a real AppRouter or server.
 */
import { describe, expect, it, vi } from 'vitest'

const mockTrpcInstance = { createClient: vi.fn(), Provider: vi.fn(), useContext: vi.fn() }

vi.mock('@trpc/react-query', () => ({
  createTRPCReact: vi.fn(() => mockTrpcInstance),
}))

// @t/api is resolved through the workspace alias — mock at module level
vi.mock('@t/api', () => ({ default: {} }))

describe('trpc module', () => {
  it('exports a truthy trpc object', async () => {
    const mod = await import('../trpc')
    expect(mod.trpc).toBeTruthy()
  })

  it('exported trpc is the instance returned by createTRPCReact', async () => {
    const mod = await import('../trpc')
    expect(mod.trpc).toBe(mockTrpcInstance)
  })

  it('createTRPCReact was called exactly once at module load', async () => {
    // The vitest config sets `clearMocks: true`, which resets call history
    // between tests. Reset modules so the trpc factory re-runs against a
    // fresh spy in this test.
    vi.resetModules()
    const { createTRPCReact } = await import('@trpc/react-query')
    await import('../trpc')
    expect(createTRPCReact).toHaveBeenCalledTimes(1)
  })
})
