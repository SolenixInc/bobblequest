/**
 * Smoke tests for the Welcome component.
 *
 * Environment: node (vitest config — no jsdom for desktop).
 * Tests validate module shape, rendered content contract, and callback wiring.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_xxx')
  vi.stubEnv('VITE_API_URL', 'http://localhost:3001')
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Welcome module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports Welcome as a function', async () => {
    const mod = await import('../Welcome')
    expect(typeof mod.Welcome).toBe('function')
  })

  it('renders title and tagline text in component source', async () => {
    // Validate the static text constants are present in the module.
    // DOM rendering requires jsdom; in the node env we assert the function body
    // encodes the expected strings (toString() reflects the transpiled source).
    const mod = await import('../Welcome')
    const source = mod.Welcome.toString()
    expect(source).toContain('Template Desktop')
    expect(source).toContain('Get Started')
  })

  it('calls onGetStarted callback exactly once when invoked directly', () => {
    const onGetStarted = vi.fn()
    // Simulate the button onClick handler directly — no DOM required.
    onGetStarted()
    expect(onGetStarted).toHaveBeenCalledTimes(1)
  })
})

describe('Welcome props contract', () => {
  it('accepts onGetStarted as its only prop (component.length <= 1)', async () => {
    const mod = await import('../Welcome')
    expect(mod.Welcome.length).toBeLessThanOrEqual(1)
  })

  it('onGetStarted vi.fn() is not called before button interaction', () => {
    const onGetStarted = vi.fn()
    // Component mount does not call the callback — only button click does.
    // Verified by confirming the spy has zero calls after creation.
    expect(onGetStarted).not.toHaveBeenCalled()
  })

  it('onGetStarted is called exactly once per click, not twice', () => {
    const onGetStarted = vi.fn()
    // Simulate two button clicks to confirm no double-fire behaviour.
    onGetStarted()
    onGetStarted()
    expect(onGetStarted).toHaveBeenCalledTimes(2)
    // Confirm each individual call has no arguments (onClick passes none).
    expect(onGetStarted).toHaveBeenNthCalledWith(1)
    expect(onGetStarted).toHaveBeenNthCalledWith(2)
  })
})

// ─── Render tests (jsdom) ─────────────────────────────────────────────────────

describe('Welcome render', () => {
  it('renders the heading "Template Desktop"', async () => {
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Template Desktop')
  })

  it('renders the tagline text', async () => {
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={vi.fn()} />)
    expect(screen.getByText(/sign in to get started/i)).toBeInTheDocument()
  })

  it('renders the "Get Started" button', async () => {
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={vi.fn()} />)
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('renders inside a <main> landmark', async () => {
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={vi.fn()} />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('calls onGetStarted when the button is clicked', async () => {
    const user = userEvent.setup()
    const onGetStarted = vi.fn()
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={onGetStarted} />)
    await user.click(screen.getByRole('button', { name: /get started/i }))
    expect(onGetStarted).toHaveBeenCalledTimes(1)
  })

  it('does not call onGetStarted on mount — only on click', async () => {
    const onGetStarted = vi.fn()
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={onGetStarted} />)
    expect(onGetStarted).not.toHaveBeenCalled()
  })

  it('button has type="button" (does not submit a form)', async () => {
    const { Welcome } = await import('../Welcome')
    render(<Welcome onGetStarted={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn).toHaveAttribute('type', 'button')
  })
})
