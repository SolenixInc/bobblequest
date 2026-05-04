/**
 * Tests for App.tsx — top-level shell component.
 *
 * Branches covered:
 *   1. hash === '#/bootstrap'  → BootstrapRoute
 *   2. !started (default)      → Welcome screen
 *   3. started                 → AuthFlow (via Suspense / lazy)
 *   4. hashchange event adds / removes listener (useHashRoute)
 *
 * Strategy:
 *   - Mock all child components so tests are hermetic and fast.
 *   - Control window.location.hash before each test.
 *   - Use fireEvent / act to simulate hash changes and button clicks.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock child components ────────────────────────────────────────────────────

vi.mock('../routes/bootstrap', () => ({
  BootstrapRoute: () => <div data-testid="bootstrap-route">BootstrapRoute</div>,
}))

vi.mock('../components/Welcome', () => ({
  Welcome: ({ onGetStarted }: { onGetStarted: () => void }) => (
    <div data-testid="welcome">
      <button data-testid="get-started" onClick={onGetStarted} type="button">
        Get Started
      </button>
    </div>
  ),
}))

// AuthFlow is lazy-loaded — mock the module so the dynamic import resolves immediately.
vi.mock('../AuthFlow', () => ({
  default: () => <div data-testid="auth-flow">AuthFlow</div>,
  AuthFlow: () => <div data-testid="auth-flow">AuthFlow</div>,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setHash(hash: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, hash },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('App — bootstrap route', () => {
  beforeEach(() => {
    setHash('#/bootstrap')
  })

  afterEach(() => {
    setHash('')
  })

  it('renders BootstrapRoute when hash is #/bootstrap', async () => {
    const { App } = await import('../App')
    render(<App />)
    expect(screen.getByTestId('bootstrap-route')).toBeDefined()
  })
})

describe('App — welcome / not-started state', () => {
  beforeEach(() => {
    setHash('')
  })

  it('renders Welcome component by default (not started)', async () => {
    const { App } = await import('../App')
    render(<App />)
    expect(screen.getByTestId('welcome')).toBeDefined()
  })

  it('transitions from Welcome to AuthFlow when Get Started is clicked', async () => {
    const { App } = await import('../App')
    render(<App />)

    expect(screen.getByTestId('welcome')).toBeDefined()

    await act(async () => {
      fireEvent.click(screen.getByTestId('get-started'))
    })

    // AuthFlow is lazy — Suspense resolves it; wait for it to appear.
    expect(screen.getByTestId('auth-flow')).toBeDefined()
  })
})

describe('App — hash routing with hashchange events', () => {
  beforeEach(() => {
    setHash('')
  })

  afterEach(() => {
    setHash('')
  })

  it('switches to BootstrapRoute on hashchange to #/bootstrap', async () => {
    const { App } = await import('../App')
    render(<App />)

    // Initially shows Welcome
    expect(screen.getByTestId('welcome')).toBeDefined()

    // Simulate a hash change
    act(() => {
      setHash('#/bootstrap')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(screen.getByTestId('bootstrap-route')).toBeDefined()
  })

  it('cleans up hashchange listener on unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { App } = await import('../App')
    const { unmount } = render(<App />)

    // Confirm addEventListener was called for hashchange
    expect(addSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))

    unmount()

    // Confirm removeEventListener was called for hashchange
    expect(removeSpy).toHaveBeenCalledWith('hashchange', expect.any(Function))

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
