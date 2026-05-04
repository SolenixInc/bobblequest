import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NoOpBillingTracker } from '../src/infrastructure/NoOpBillingTracker'
import { _resetForTests } from '../src/infrastructure/init'

// Use vi.hoisted() so mockInitBillingTracker is available in the vi.mock factory
// (vi.mock calls are hoisted to top of file, before const declarations).
const { mockInitBillingTracker } = vi.hoisted(() => {
  return { mockInitBillingTracker: vi.fn() }
})

vi.mock('../src/infrastructure/init', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/infrastructure/init')>()
  return {
    ...original,
    initBillingTracker: mockInitBillingTracker,
  }
})

afterEach(() => {
  cleanup()
})

describe('BillingProvider', () => {
  const mockTracker = new NoOpBillingTracker()
  const config = { revenueCat: { publicApiKey: 'rcb_test_key' } }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetForTests()
    vi.stubGlobal('window', {})
    mockInitBillingTracker.mockResolvedValue(mockTracker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders children after tracker initializes', async () => {
    const { BillingProvider } = await import('../src/react/BillingProvider')

    await act(async () => {
      render(
        <BillingProvider config={config}>
          <div>billing content</div>
        </BillingProvider>,
      )
    })

    expect(screen.getByText('billing content')).toBeDefined()
    expect(mockInitBillingTracker).toHaveBeenCalledWith({
      apiKey: 'rcb_test_key',
      appUserId: undefined,
    })
  })

  it('passes userId to initBillingTracker', async () => {
    const { BillingProvider } = await import('../src/react/BillingProvider')

    await act(async () => {
      render(
        <BillingProvider config={config} userId="user_abc">
          <div>user content</div>
        </BillingProvider>,
      )
    })

    expect(mockInitBillingTracker).toHaveBeenCalledWith({
      apiKey: 'rcb_test_key',
      appUserId: 'user_abc',
    })
  })

  it('provides tracker via context for useBilling', async () => {
    const { BillingProvider } = await import('../src/react/BillingProvider')
    const { useBilling } = await import('../src/react/useBilling')

    function TestConsumer() {
      const tracker = useBilling()
      return <span data-testid="tracker-type">{tracker.constructor.name}</span>
    }

    render(
      <BillingProvider config={config}>
        <TestConsumer />
      </BillingProvider>,
    )

    // BillingProvider renders null until initBillingTracker resolves; use
    // findByTestId (retries up to timeout) instead of getByTestId (synchronous).
    const el = await screen.findByTestId('tracker-type')
    expect(el.textContent).toBe('NoOpBillingTracker')
  })

  it('re-initializes when userId changes', async () => {
    const { BillingProvider } = await import('../src/react/BillingProvider')
    const { rerender } = render(
      <BillingProvider config={config} userId="user_1">
        <div>child</div>
      </BillingProvider>,
    )

    await act(async () => {
      rerender(
        <BillingProvider config={config} userId="user_2">
          <div>child</div>
        </BillingProvider>,
      )
    })

    // Called at least twice: once for user_1, once when user_2 triggers re-init.
    expect(mockInitBillingTracker.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('logs a warning and renders null when initBillingTracker rejects', async () => {
    // Override: this specific call rejects.
    mockInitBillingTracker.mockRejectedValueOnce(new Error('RC network failure'))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { BillingProvider } = await import('../src/react/BillingProvider')

    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <BillingProvider config={config} userId="user_err">
          <div data-testid="child">child</div>
        </BillingProvider>,
      )
      container = result.container
    })

    // The catch block logs a warning ...
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('BillingProvider: failed to initialize billing tracker:'),
      expect.any(Error),
    )
    // ... and renders null (no children visible because tracker === null).
    expect(container.querySelector('[data-testid="child"]')).toBeNull()

    warnSpy.mockRestore()
  })
})
