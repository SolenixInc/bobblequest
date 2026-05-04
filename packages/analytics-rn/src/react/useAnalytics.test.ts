import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'

vi.mock('../infrastructure/init', () => ({
  getAnalytics: vi.fn(),
}))

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return analytics instance from getAnalytics', async () => {
    const { getAnalytics } = await import('../infrastructure/init')
    const mockAnalytics = { capture: vi.fn() }
    vi.mocked(getAnalytics).mockReturnValue(mockAnalytics as never)

    const { result } = renderHook(() => useAnalytics())

    expect(result.current).toBe(mockAnalytics)
    expect(getAnalytics).toHaveBeenCalled()
  })

  it('should return same instance across multiple calls', async () => {
    const { getAnalytics } = await import('../infrastructure/init')
    const mockAnalytics = { capture: vi.fn() }
    vi.mocked(getAnalytics).mockReturnValue(mockAnalytics as never)

    const { result: result1 } = renderHook(() => useAnalytics())
    const { result: result2 } = renderHook(() => useAnalytics())

    expect(result1.current).toBe(result2.current)
  })
})
