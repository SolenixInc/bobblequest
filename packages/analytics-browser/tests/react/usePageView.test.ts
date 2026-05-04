import { renderHook } from '@testing-library/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => ({ toString: () => '' })),
}))

vi.mock('../../src/react/useAnalytics', () => ({
  useAnalytics: vi.fn(),
}))

describe('usePageView', () => {
  const mockCapture = vi.fn()
  const mockSessionId = vi.fn(() => 'sess-abc')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call analytics.capture with $pageview when pathname changes', async () => {
    const { useAnalytics } = await import('../../src/react/useAnalytics')
    const { usePageView } = await import('../../src/react/usePageView')

    vi.mocked(useAnalytics).mockReturnValue({
      capture: mockCapture,
      sessionId: mockSessionId,
    } as never)

    vi.mocked(usePathname).mockReturnValue('/initial')
    vi.mocked(useSearchParams).mockReturnValue({
      toString: () => 'param=value',
    } as never)

    const { rerender } = renderHook(() => usePageView())

    expect(mockCapture).toHaveBeenCalledWith('$pageview', 'sess-abc', {
      $current_url: '/initial?param=value',
    })

    vi.mocked(usePathname).mockReturnValue('/new-path')
    rerender()

    expect(mockCapture).toHaveBeenCalledWith('$pageview', 'sess-abc', {
      $current_url: '/new-path?param=value',
    })
  })

  it('should construct URL from pathname and searchParams', async () => {
    const { useAnalytics } = await import('../../src/react/useAnalytics')
    const { usePageView } = await import('../../src/react/usePageView')

    vi.mocked(useAnalytics).mockReturnValue({
      capture: mockCapture,
      sessionId: mockSessionId,
    } as never)

    vi.mocked(usePathname).mockReturnValue('/about')
    vi.mocked(useSearchParams).mockReturnValue({ toString: () => '' } as never)

    renderHook(() => usePageView())

    expect(mockCapture).toHaveBeenCalledWith('$pageview', 'sess-abc', {
      $current_url: '/about?',
    })
  })
})
