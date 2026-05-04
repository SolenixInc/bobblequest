import { describe, expect, it } from 'vitest'

describe('analytics-bridge', () => {
  it('exports ClerkAnalyticsBridge as a function', async () => {
    const mod = await import('../analytics-bridge')
    expect(typeof mod.ClerkAnalyticsBridge).toBe('function')
  })

  it('ClerkAnalyticsBridge returns null (no-op bridge)', async () => {
    const { ClerkAnalyticsBridge } = await import('../analytics-bridge')
    expect(ClerkAnalyticsBridge()).toBeNull()
  })
})
