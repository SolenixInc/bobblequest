/**
 * Tests for apps/web/src/app/page.tsx
 *
 * Covers:
 *  - Renders heading "Template Web"
 *  - Renders sub-heading / description text
 *  - Renders a Login link pointing to /login
 *  - Renders a Dashboard link pointing to /dashboard
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// next/link renders an <a> in tests; mock it as a simple passthrough so we can
// inspect href without needing the full Next.js runtime.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------
import HomePage from '../page.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
})

describe('HomePage', () => {
  test('renders the page heading', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
    expect(screen.getByText('Template Web')).toBeDefined()
  })

  test('renders the description text', () => {
    render(<HomePage />)

    expect(screen.getByText('Authenticated product UI')).toBeDefined()
  })

  test('renders a Login link pointing to /login', () => {
    render(<HomePage />)

    const loginLink = screen.getByRole('link', { name: 'Login' })
    expect(loginLink).toBeDefined()
    expect(loginLink.getAttribute('href')).toBe('/login')
  })

  test('renders a Dashboard link pointing to /dashboard', () => {
    render(<HomePage />)

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
    expect(dashboardLink).toBeDefined()
    expect(dashboardLink.getAttribute('href')).toBe('/dashboard')
  })

  test('renders exactly two navigation links', () => {
    render(<HomePage />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })
})
