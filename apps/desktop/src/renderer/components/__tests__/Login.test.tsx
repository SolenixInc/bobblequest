/**
 * Tests for Login.tsx
 *
 * Covers every branch in the two-step email-code Clerk sign-in flow:
 *   - Render: not loaded (button disabled)
 *   - Stage 1 (email form):
 *       - emailFactor not found → error message
 *       - signIn.create throws → error from Error object
 *       - signIn.create throws non-Error → fallback message
 *       - happy path → advances to code stage
 *   - Stage 2 (code form):
 *       - verify: result.status !== 'complete' → "Additional verification required"
 *       - verify: attemptFirstFactor throws → error message
 *       - verify: happy path → setActive called
 *       - "Use a different email" resets to stage 1
 *   - Guard: submit does nothing when isLoaded is false
 *
 * Strategy: vi.mock '../lib/clerk' — useSignIn returns a controllable object.
 * Each describe block configures the mock shape for its scenario.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Controllable mock state ──────────────────────────────────────────────────

const mockSetActive = vi.fn()
const mockCreate = vi.fn()
const mockPrepareFirstFactor = vi.fn()
const mockAttemptFirstFactor = vi.fn()

// Default signIn object — mutated per describe block.
let mockSignInState: {
  isLoaded: boolean
  signIn: {
    create: typeof mockCreate
    prepareFirstFactor: typeof mockPrepareFirstFactor
    attemptFirstFactor: typeof mockAttemptFirstFactor
  } | null
  setActive: typeof mockSetActive | null
} = {
  isLoaded: true,
  signIn: {
    create: mockCreate,
    prepareFirstFactor: mockPrepareFirstFactor,
    attemptFirstFactor: mockAttemptFirstFactor,
  },
  setActive: mockSetActive,
}

vi.mock('../../lib/clerk', () => ({
  useSignIn: () => mockSignInState,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function renderLogin() {
  const { Login } = await import('../Login')
  render(<Login />)
}

async function fillEmailAndSubmit(email = 'user@example.com') {
  const emailInput = screen.getByPlaceholderText('Email')
  await userEvent.clear(emailInput)
  await userEvent.type(emailInput, email)
  await userEvent.click(screen.getByRole('button', { name: /send code/i }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Login — not loaded (isLoaded=false)', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: false,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('renders the email form', async () => {
    await renderLogin()
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('Send code button is disabled when isLoaded=false', async () => {
    await renderLogin()
    const button = screen.getByRole('button', { name: /send code/i })
    expect(button).toBeDisabled()
  })

  it('does not call signIn.create when submitted while isLoaded=false', async () => {
    await renderLogin()
    // Clicking a disabled button — no call should fire
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('handleRequestCode guard fires when form is submitted directly with isLoaded=false', async () => {
    // The button is disabled so clicking it skips onSubmit. Use fireEvent.submit
    // to directly trigger the handler and cover the `!isLoaded` branch at line 24.
    await renderLogin()
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('Login — stage 1: happy path advances to code stage', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('transitions to the code stage after a successful request', async () => {
    await renderLogin()
    await fillEmailAndSubmit('user@example.com')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Enter code' })).toBeInTheDocument()
    })
  })

  it('shows the email address in the code stage description', async () => {
    await renderLogin()
    await fillEmailAndSubmit('user@example.com')
    await waitFor(() => {
      expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
    })
  })

  it('calls signIn.create with the entered email identifier', async () => {
    await renderLogin()
    await fillEmailAndSubmit('test@hello.com')
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ identifier: 'test@hello.com' })
    })
  })

  it('calls prepareFirstFactor with email_code strategy', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => {
      expect(mockPrepareFirstFactor).toHaveBeenCalledWith({
        strategy: 'email_code',
        emailAddressId: 'eid_1',
      })
    })
  })
})

describe('Login — stage 1: emailFactor missing → error displayed', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    // No email_code factor in the returned attempt
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'google_one_tap' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('shows the "not enabled" error message', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => {
      expect(
        screen.getByText('Email code sign-in is not enabled for this account.'),
      ).toBeInTheDocument()
    })
  })

  it('does not advance to the code stage', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Enter code' })).not.toBeInTheDocument()
    })
  })
})

describe('Login — stage 1: signIn.create throws an Error', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockRejectedValue(new Error('Network timeout'))
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('displays the thrown error message', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })
  })
})

describe('Login — stage 1: signIn.create throws a non-Error value', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockRejectedValue('string error')
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('displays the fallback "Failed to send code" message', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => {
      expect(screen.getByText('Failed to send code')).toBeInTheDocument()
    })
  })
})

describe('Login — stage 2: happy path completes sign-in', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
    mockAttemptFirstFactor.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_abc',
    })
    mockSetActive.mockResolvedValue(undefined)
  })

  it('calls setActive with the created session id', async () => {
    await renderLogin()
    // Advance to code stage
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    // Submit the code
    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_abc' })
    })
  })

  it('calls attemptFirstFactor with email_code strategy and the entered code', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '654321')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(mockAttemptFirstFactor).toHaveBeenCalledWith({
        strategy: 'email_code',
        code: '654321',
      })
    })
  })
})

describe('Login — stage 2: incomplete status shows "Additional verification required"', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
    mockAttemptFirstFactor.mockResolvedValue({
      status: 'needs_second_factor',
      createdSessionId: null,
    })
  })

  it('shows "Additional verification required" error', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(screen.getByText('Additional verification required.')).toBeInTheDocument()
    })
  })
})

describe('Login — stage 2: attemptFirstFactor throws an Error', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
    mockAttemptFirstFactor.mockRejectedValue(new Error('Wrong code'))
  })

  it('displays the thrown error message', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '999999')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(screen.getByText('Wrong code')).toBeInTheDocument()
    })
  })
})

describe('Login — stage 2: attemptFirstFactor throws non-Error value', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
    mockAttemptFirstFactor.mockRejectedValue('bad string')
  })

  it('displays the fallback "Invalid code" message', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '111111')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })
  })
})

describe('Login — isLoaded=true but signIn=null (handleRequestCode guard)', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: null,
      setActive: mockSetActive,
    }
  })

  it('does not throw and does not call create when signIn is null', async () => {
    await renderLogin()
    // Button is enabled when isLoaded=true even though signIn=null
    const button = screen.getByRole('button', { name: /send code/i })
    // Submit the form — the guard `if (!isLoaded || !signIn) return` fires
    await userEvent.click(button)
    // No error thrown, no create called
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('Login — isLoaded=false and signIn=null (both guard conditions true, form submitted directly)', () => {
  // The button is disabled when isLoaded=false, so clicking it does NOT trigger
  // onSubmit. We use fireEvent.submit on the form directly to bypass the disabled
  // button and actually execute handleRequestCode — which hits line 24's
  // `if (!isLoaded || !signIn) return` with BOTH conditions true.
  beforeEach(() => {
    mockSignInState = {
      isLoaded: false,
      signIn: null,
      setActive: mockSetActive,
    }
  })

  it('returns early without calling create when both isLoaded=false and signIn=null', async () => {
    await renderLogin()
    // Submit the form directly — the guard fires even though the button is disabled
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('Login — isLoaded=true but signIn=null (handleVerifyCode guard, stage 2 reached via re-render hack)', () => {
  // To hit line 53's `!signIn` branch we need to be on the code stage with signIn=null.
  // We reach the code stage with a real signIn first, then switch to null.
  it('does not call attemptFirstFactor when signIn becomes null before verify', async () => {
    // First mount with real signIn so we can reach stage 2
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)

    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    // Now switch signIn to null so the guard fires on verify
    mockSignInState = {
      isLoaded: true,
      signIn: null,
      setActive: mockSetActive,
    }

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    expect(mockAttemptFirstFactor).not.toHaveBeenCalled()
  })

  it('does not call attemptFirstFactor when isLoaded becomes false before verify', async () => {
    // Reach stage 2 with isLoaded=true, then switch to isLoaded=false
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)

    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    // Switch to isLoaded=false — the guard at handleVerifyCode fires first
    mockSignInState = {
      isLoaded: false,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    expect(mockAttemptFirstFactor).not.toHaveBeenCalled()
  })
})

describe('Login — stage 2: complete status but setActive is undefined (optional-chain no-op)', () => {
  // Covers the `setActive?.()` branch where setActive is undefined —
  // the sign-in completes but the optional call is a no-op.
  it('does not throw when setActive is undefined and status is complete', async () => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: null,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
    mockAttemptFirstFactor.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_xyz',
    })

    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    // No error thrown — optional chain safely skips undefined setActive
    await waitFor(() => {
      expect(mockAttemptFirstFactor).toHaveBeenCalledWith({
        strategy: 'email_code',
        code: '123456',
      })
    })
  })
})

describe('Login — stage 2: "Use a different email" resets to email stage', () => {
  beforeEach(() => {
    mockSignInState = {
      isLoaded: true,
      signIn: {
        create: mockCreate,
        prepareFirstFactor: mockPrepareFirstFactor,
        attemptFirstFactor: mockAttemptFirstFactor,
      },
      setActive: mockSetActive,
    }
    mockCreate.mockResolvedValue({
      supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'eid_1' }],
    })
    mockPrepareFirstFactor.mockResolvedValue(undefined)
  })

  it('returns to the email form when the back link is clicked', async () => {
    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    await userEvent.click(screen.getByRole('button', { name: /use a different email/i }))

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('clears the error when returning to email stage', async () => {
    // First introduce an error on stage 2, then go back
    mockAttemptFirstFactor.mockRejectedValue(new Error('Wrong code'))

    await renderLogin()
    await fillEmailAndSubmit()
    await waitFor(() => screen.getByRole('heading', { name: 'Enter code' }))

    const codeInput = screen.getByPlaceholderText('6-digit code')
    await userEvent.type(codeInput, '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => screen.getByText('Wrong code'))

    await userEvent.click(screen.getByRole('button', { name: /use a different email/i }))

    // Error element should be gone on the email stage
    expect(screen.queryByText('Wrong code')).not.toBeInTheDocument()
  })
})
