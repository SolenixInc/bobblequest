import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// Mock @clerk/nextjs so <SignIn /> is a stable, testable stub
vi.mock('@clerk/nextjs', () => ({
  SignIn: () => <div data-testid="clerk-signin" />,
}))

import SignInPage from '../page.js'

afterEach(() => {
  cleanup()
})

describe('SignInPage', () => {
  test('renders the Clerk SignIn stub', () => {
    render(<SignInPage />)
    expect(screen.getByTestId('clerk-signin')).toBeDefined()
  })

  test('renders SignIn inside the centered container', () => {
    render(<SignInPage />)
    const stub = screen.getByTestId('clerk-signin')
    // The container is the <main> element — closest walks up to it
    expect(stub.closest('main')).not.toBeNull()
  })
})
