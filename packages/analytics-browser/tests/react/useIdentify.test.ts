import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/react/useAnalytics', () => ({
  useAnalytics: vi.fn(),
}))

describe('useIdentify', () => {
  const mockIdentify = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call analytics.identify when userId is provided', async () => {
    const { useAnalytics } = await import('../../src/react/useAnalytics')
    const { useIdentify } = await import('../../src/react/useIdentify')

    vi.mocked(useAnalytics).mockReturnValue({
      identify: mockIdentify,
    } as never)

    const { rerender } = renderHook(({ userId, traits }) => useIdentify(userId, traits), {
      initialProps: { userId: 'user-1', traits: { name: 'Test' } },
    })

    expect(mockIdentify).toHaveBeenCalledWith('user-1', { name: 'Test' })

    rerender({ userId: 'user-2', traits: { name: 'Test 2' } })
    expect(mockIdentify).toHaveBeenCalledWith('user-2', { name: 'Test 2' })
  })

  it('should not call identify when userId is falsy', async () => {
    const { useAnalytics } = await import('../../src/react/useAnalytics')
    const { useIdentify } = await import('../../src/react/useIdentify')

    vi.mocked(useAnalytics).mockReturnValue({
      identify: mockIdentify,
    } as never)

    renderHook(({ userId }) => useIdentify(userId), {
      initialProps: { userId: '' },
    })

    expect(mockIdentify).not.toHaveBeenCalled()
  })

  it('should not call identify when userId is undefined', async () => {
    const { useAnalytics } = await import('../../src/react/useAnalytics')
    const { useIdentify } = await import('../../src/react/useIdentify')

    vi.mocked(useAnalytics).mockReturnValue({
      identify: mockIdentify,
    } as never)

    renderHook(({ userId }) => useIdentify(userId), {
      initialProps: { userId: undefined as string | undefined },
    })

    expect(mockIdentify).not.toHaveBeenCalled()
  })
})
