import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// Mock @clerk/nextjs so <SignUp /> is a stable, testable stub
vi.mock('@clerk/nextjs', () => ({
  SignUp: () => <div data-testid="clerk-signup" />,
}))

import SignUpPage from '../page.js'

afterEach(() => {
  cleanup()
})

describe('SignUpPage', () => {
  test('renders the Clerk SignUp stub', () => {
    render(<SignUpPage />)
    expect(screen.getByTestId('clerk-signup')).toBeDefined()
  })

  test('renders SignUp inside the centered container', () => {
    render(<SignUpPage />)
    const stub = screen.getByTestId('clerk-signup')
    // The container is the <main> element — closest walks up to it
    expect(stub.closest('main')).not.toBeNull()
  })
})
