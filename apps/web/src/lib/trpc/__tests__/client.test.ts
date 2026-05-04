import { beforeAll, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Sentinel — the value createTRPCReact() will return.  Using vi.hoisted()
// makes it available inside the vi.mock() factory below.
// ---------------------------------------------------------------------------
const { sentinel } = vi.hoisted(() => {
  const sentinel = { _isSentinel: true as const }
  return { sentinel }
})

// ---------------------------------------------------------------------------
// Mock @trpc/react-query so createTRPCReact returns our sentinel.
// The type parameter <AppRouter> is erased at runtime — no runtime branch.
// ---------------------------------------------------------------------------
vi.mock('@trpc/react-query', () => ({
  createTRPCReact: vi.fn(() => sentinel),
}))

// @t/api only contributes a `type` import — no runtime value to mock.

// ---------------------------------------------------------------------------
// Load the module under test after mocks are registered.
// ---------------------------------------------------------------------------
let trpc: unknown

beforeAll(async () => {
  const mod = await import('../client.js')
  trpc = mod.trpc
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('trpc client', () => {
  test('trpc is the value returned by createTRPCReact', () => {
    expect(trpc).toBe(sentinel)
  })
})
