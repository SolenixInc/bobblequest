import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @t/analytics-browser so getAnalytics() returns a controlled spy.
// global-error.tsx calls getAnalytics() at the module level (not the hook),
// so we mock the module-level export directly.
// ---------------------------------------------------------------------------
const captureException = vi.fn()

vi.mock('@t/analytics-browser', () => ({
  getAnalytics: () => ({ captureException }),
}))

import GlobalError from '../global-error.js'

afterEach(() => {
  cleanup()
})

describe('GlobalError (global-error.tsx)', () => {
  const stubError = new Error('global test error')
  const resetFn = vi.fn()

  test('renders without crashing given a stub Error and reset prop', () => {
    render(<GlobalError error={stubError} reset={resetFn} />)
    expect(screen.getByText('Something went wrong.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
  })

  test('calls captureException with the error inside the effect', () => {
    render(<GlobalError error={stubError} reset={resetFn} />)
    expect(captureException).toHaveBeenCalledWith(stubError, 'anonymous')
    expect(captureException).toHaveBeenCalledTimes(1)
  })

  test('clicking the "Try again" button fires the reset prop', () => {
    render(<GlobalError error={stubError} reset={resetFn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetFn).toHaveBeenCalledTimes(1)
  })
})
