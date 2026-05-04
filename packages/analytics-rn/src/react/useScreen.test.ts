import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { useScreen } from './useScreen'

vi.mock('./useAnalytics', () => ({
  useAnalytics: vi.fn(),
}))

describe('useScreen', () => {
  const mockCaptureScreen = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAnalytics).mockReturnValue({
      captureScreen: mockCaptureScreen,
    } as never)
  })

  it('should call captureScreen with screen name on mount', () => {
    renderHook(() => useScreen('HomeScreen'))

    expect(mockCaptureScreen).toHaveBeenCalledWith('HomeScreen', undefined)
  })

  it('should call captureScreen with properties when provided', () => {
    renderHook(() => useScreen('ProfileScreen', { tab: 'settings' }))

    expect(mockCaptureScreen).toHaveBeenCalledWith('ProfileScreen', { tab: 'settings' })
  })

  it('should re-call captureScreen when screenName changes', () => {
    const { rerender } = renderHook(({ name }) => useScreen(name), {
      initialProps: { name: 'HomeScreen' },
    })

    expect(mockCaptureScreen).toHaveBeenCalledWith('HomeScreen', undefined)

    rerender({ name: 'ProfileScreen' })
    expect(mockCaptureScreen).toHaveBeenCalledWith('ProfileScreen', undefined)
    expect(mockCaptureScreen).toHaveBeenCalledTimes(2)
  })

  it('should not call captureScreen when screenName is empty', () => {
    renderHook(() => useScreen(''))

    expect(mockCaptureScreen).not.toHaveBeenCalled()
  })
})
