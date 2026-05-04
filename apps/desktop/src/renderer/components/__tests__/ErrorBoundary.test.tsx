/**
 * Tests for ErrorBoundary.tsx — React error boundary class component.
 *
 * Branches covered:
 *   1. No error → renders children normally
 *   2. Child throws → renders default fallback UI (role="alert", h2, details)
 *   3. Child throws + custom fallback prop → renders custom fallback, not default
 *   4. componentDidCatch is called → console.error receives the error
 *
 * Strategy:
 *   - Use a Thrower child component that throws on render when told to.
 *   - Suppress expected React console.error output with a spy to keep test output clean.
 */
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

// ─── Helper ──────────────────────────────────────────────────────────────────

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('test render error')
  }
  return <div data-testid="child">child content</div>
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ErrorBoundary — no error', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeDefined()
    expect(screen.getByText('child content')).toBeDefined()
  })
})

describe('ErrorBoundary — error caught, default fallback', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress the expected React error boundary console output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    )

    // Default fallback: role="alert" div with h2
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Something went wrong.')).toBeDefined()
  })

  it('shows the error message in details/pre when no fallback prop given', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Error details')).toBeDefined()
    expect(screen.getByText('test render error')).toBeDefined()
  })

  it('calls componentDidCatch and logs to console.error', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    )

    // ErrorBoundary.componentDidCatch calls console.error with the error
    const calls = consoleErrorSpy.mock.calls
    const boundaryCall = calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('ErrorBoundary caught an error:'),
    )
    expect(boundaryCall).toBeDefined()
    expect(boundaryCall![1]).toBeInstanceOf(Error)
    expect((boundaryCall![1] as Error).message).toBe('test render error')
  })
})

describe('ErrorBoundary — error caught, custom fallback', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders the custom fallback prop instead of the default UI', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('custom-fallback')).toBeDefined()
    expect(screen.getByText('Custom Error UI')).toBeDefined()
    // Default fallback must NOT appear
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('Something went wrong.')).toBeNull()
  })
})

describe('ErrorBoundary — getDerivedStateFromError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('static getDerivedStateFromError returns hasError:true with the error', () => {
    const testError = new Error('derived state error')
    const state = ErrorBoundary.getDerivedStateFromError(testError)
    expect(state.hasError).toBe(true)
    expect(state.error).toBe(testError)
  })

  it('does not render children after an error is caught', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>,
    )
    // Children should not be in the DOM — fallback took over
    expect(screen.queryByTestId('child')).toBeNull()
  })
})
