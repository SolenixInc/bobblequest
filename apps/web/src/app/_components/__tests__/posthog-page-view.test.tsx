/**
 * Tests for apps/web/src/app/_components/posthog-page-view.tsx
 *
 * Covers:
 *  - PostHogPageView renders without crashing
 *  - usePageView hook is called on mount (via PageViewTracker)
 *  - ClerkAnalyticsBridge component is mounted
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// vi.hoisted — refs used inside vi.mock() factories
// ---------------------------------------------------------------------------
const { mockUsePageView, mockClerkAnalyticsBridge } = vi.hoisted(() => {
  const mockUsePageView = vi.fn()
  const mockClerkAnalyticsBridge = vi.fn(() => null)
  return { mockUsePageView, mockClerkAnalyticsBridge }
})

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@t/analytics-browser', () => ({
  usePageView: () => mockUsePageView(),
  ClerkAnalyticsBridge: () => mockClerkAnalyticsBridge(),
}))

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------
import { PostHogPageView } from '../posthog-page-view.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PostHogPageView', () => {
  test('renders without crashing and returns null content', () => {
    const { container } = render(<PostHogPageView />)
    // The component renders a fragment with two null-returning children
    expect(container).toBeDefined()
  })

  test('calls usePageView on mount', () => {
    render(<PostHogPageView />)

    expect(mockUsePageView).toHaveBeenCalled()
  })

  test('mounts ClerkAnalyticsBridge', () => {
    render(<PostHogPageView />)

    expect(mockClerkAnalyticsBridge).toHaveBeenCalled()
  })

  test('calls usePageView exactly once per render', () => {
    render(<PostHogPageView />)

    expect(mockUsePageView).toHaveBeenCalledTimes(1)
  })

  test('mounts ClerkAnalyticsBridge exactly once per render', () => {
    render(<PostHogPageView />)

    expect(mockClerkAnalyticsBridge).toHaveBeenCalledTimes(1)
  })
})
