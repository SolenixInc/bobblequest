import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { useIdentify } from './useIdentify'

vi.mock('./useAnalytics', () => ({
  useAnalytics: vi.fn(),
}))

describe('useIdentify', () => {
  const mockIdentify = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAnalytics).mockReturnValue({
      identify: mockIdentify,
    } as never)
  })

  it('should call analytics.identify when userId is provided', () => {
    const { rerender } = renderHook(({ userId, traits }) => useIdentify(userId, traits), {
      initialProps: { userId: 'user-1', traits: { name: 'Test' } },
    })

    expect(mockIdentify).toHaveBeenCalledWith('user-1', { name: 'Test' })

    rerender({ userId: 'user-2', traits: { name: 'Test 2' } })
    expect(mockIdentify).toHaveBeenCalledWith('user-2', { name: 'Test 2' })
  })

  it('should not call identify when userId is falsy', () => {
    renderHook(({ userId }) => useIdentify(userId), {
      initialProps: { userId: '' },
    })

    expect(mockIdentify).not.toHaveBeenCalled()
  })

  it('should not call identify when userId is undefined', () => {
    renderHook(({ userId }) => useIdentify(userId), {
      initialProps: { userId: undefined as string | undefined },
    })

    expect(mockIdentify).not.toHaveBeenCalled()
  })
})
