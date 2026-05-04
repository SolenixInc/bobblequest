import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @t/analytics-browser so useAnalytics() returns a controlled spy.
// useAnalytics in the source simply delegates to getAnalytics(), so mocking
// at the module level is the correct seam — no Provider wrapper required.
// ---------------------------------------------------------------------------
const captureException = vi.fn()

vi.mock('@t/analytics-browser', () => ({
  useAnalytics: () => ({ captureException }),
}))

import RouteError from '../error.js'

afterEach(() => {
  cleanup()
})

describe('RouteError (error.tsx)', () => {
  const stubError = new Error('test error')
  const resetFn = vi.fn()

  test('renders without crashing given a stub Error and reset prop', () => {
    render(<RouteError error={stubError} reset={resetFn} />)
    expect(screen.getByText('Something went wrong.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
  })

  test('calls captureException with the error inside the effect', () => {
    render(<RouteError error={stubError} reset={resetFn} />)
    // useEffect fires synchronously in jsdom via @testing-library/react
    expect(captureException).toHaveBeenCalledWith(stubError, 'anonymous')
    expect(captureException).toHaveBeenCalledTimes(1)
  })

  test('clicking the "Try again" button fires the reset prop', () => {
    render(<RouteError error={stubError} reset={resetFn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetFn).toHaveBeenCalledTimes(1)
  })
})
