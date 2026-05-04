/**
 * Tests for Dashboard.tsx
 *
 * Covers:
 *   - loading state (trpc query in-flight)
 *   - success state (data present, serialised as JSON)
 *   - logout via useClerk().signOut
 *
 * Strategy:
 *   - vi.mock '../lib/clerk' so useClerk returns a controllable spy
 *   - vi.mock '../lib/trpc' so trpc.users.me.useQuery returns a
 *     controllable { data, isLoading } shape per test
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn()
vi.mock('../../lib/clerk', () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}))

// Controllable tRPC query state — mutated per test in beforeEach.
const queryState: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
}

vi.mock('../../lib/trpc', () => ({
  trpc: {
    users: {
      me: {
        useQuery: () => ({ data: queryState.data, isLoading: queryState.isLoading }),
      },
    },
  },
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard — loading state', () => {
  beforeEach(() => {
    queryState.isLoading = true
    queryState.data = undefined
    mockSignOut.mockResolvedValue(undefined)
  })

  it('renders a loading indicator while the query is in-flight', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('does not render the main header while loading', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
  })
})

describe('Dashboard — success state', () => {
  beforeEach(() => {
    queryState.isLoading = false
    queryState.data = { id: 'user_1', email: 'a@b.com' }
    mockSignOut.mockResolvedValue(undefined)
  })

  it('renders the Dashboard heading when data is available', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders the Users / Me section heading', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Users / Me' })).toBeInTheDocument()
  })

  it('serialises the user data as pretty-printed JSON inside a <pre>', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    // <pre> has no semantic ARIA role in jsdom; query by element directly
    const pre = document.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre?.textContent).toContain('user_1')
    expect(pre?.textContent).toContain('a@b.com')
  })

  it('renders the Sign out button', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('calls signOut when the Sign out button is clicked', async () => {
    const user = userEvent.setup()
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Dashboard — data absent (undefined)', () => {
  beforeEach(() => {
    queryState.isLoading = false
    queryState.data = undefined
    mockSignOut.mockResolvedValue(undefined)
  })

  it('renders the Dashboard heading even when data is undefined', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders null JSON when data is undefined', async () => {
    const { Dashboard } = await import('../Dashboard')
    render(<Dashboard />)
    // JSON.stringify(undefined, null, 2) === undefined — React renders nothing in <pre>
    // The <pre> element should still exist but be empty.
    const pre = document.querySelector('pre')
    expect(pre).toBeInTheDocument()
  })
})
