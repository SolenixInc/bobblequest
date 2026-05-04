/**
 * Tests for AuthFlow.tsx — auth-gating component.
 *
 * Branches covered:
 *   1. Renders TrpcProvider as root wrapper
 *   2. SignedIn slot rendered inside TrpcProvider (containing Dashboard)
 *   3. SignedOut slot rendered inside TrpcProvider (containing Login)
 *   4. Default export equals named AuthFlow export
 *
 * Strategy:
 *   - Mock all dependencies: TrpcProvider, SignedIn, SignedOut (from lib/clerk),
 *     Dashboard, Login. This makes the test purely structural.
 *   - Render AuthFlow and assert slot / child relationships.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock lib/clerk (re-exports from @clerk/clerk-react)
vi.mock('../lib/clerk', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-in">{children}</div>
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out">{children}</div>
  ),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ getToken: vi.fn() }),
  useUser: () => ({ user: null, isLoaded: true }),
}))

// Mock TrpcProvider
vi.mock('../lib/providers', () => ({
  TrpcProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="trpc-provider">{children}</div>
  ),
}))

// Mock Dashboard
vi.mock('../components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}))

// Mock Login
vi.mock('../components/Login', () => ({
  Login: () => <div data-testid="login">Login</div>,
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthFlow', () => {
  it('renders TrpcProvider as the root wrapper', async () => {
    const { AuthFlow } = await import('../AuthFlow')
    render(<AuthFlow />)
    expect(screen.getByTestId('trpc-provider')).toBeDefined()
  })

  it('renders SignedIn slot inside TrpcProvider', async () => {
    const { AuthFlow } = await import('../AuthFlow')
    render(<AuthFlow />)
    expect(screen.getByTestId('signed-in')).toBeDefined()
  })

  it('renders SignedOut slot inside TrpcProvider', async () => {
    const { AuthFlow } = await import('../AuthFlow')
    render(<AuthFlow />)
    expect(screen.getByTestId('signed-out')).toBeDefined()
  })

  it('renders Dashboard inside SignedIn', async () => {
    const { AuthFlow } = await import('../AuthFlow')
    render(<AuthFlow />)
    const signedIn = screen.getByTestId('signed-in')
    expect(signedIn.querySelector('[data-testid="dashboard"]')).not.toBeNull()
  })

  it('renders Login inside SignedOut', async () => {
    const { AuthFlow } = await import('../AuthFlow')
    render(<AuthFlow />)
    const signedOut = screen.getByTestId('signed-out')
    expect(signedOut.querySelector('[data-testid="login"]')).not.toBeNull()
  })

  it('has a default export equal to the named AuthFlow export', async () => {
    const mod = await import('../AuthFlow')
    expect(mod.default).toBe(mod.AuthFlow)
  })
})
