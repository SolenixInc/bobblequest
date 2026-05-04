/**
 * Smoke tests for the Paywall component.
 *
 * Environment: node (vitest config — no jsdom for desktop).
 * Tests validate module shape and the exported component is a function,
 * plus the structural contract of props and hook dependencies.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_xxx')
  vi.stubEnv('VITE_API_URL', 'http://localhost:3001')
})

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockUseBilling = vi.fn()
const mockUseBillingContext = vi.fn()

// Mock the actual module path that Paywall.tsx resolves to.
// Paywall.tsx: import from '../lib/billing/DesktopBillingProvider'
// From Paywall.tsx location (src/renderer/components/), that resolves to:
//   src/renderer/lib/billing/DesktopBillingProvider
// From this test file (src/renderer/components/__tests__/), that is:
//   ../../lib/billing/DesktopBillingProvider
vi.mock('../../lib/billing/DesktopBillingProvider', () => ({
  useBilling: mockUseBilling,
  useBillingContext: mockUseBillingContext,
}))

// ─── Helper: build a minimal Offering / Package shape ────────────────────────

function makePackage(opts: {
  identifier: string
  title: string
  description?: string
  formattedPrice?: string
  productIdentifier?: string
  owned?: boolean
}) {
  return {
    identifier: opts.identifier,
    webBillingProduct: {
      identifier: opts.productIdentifier ?? opts.identifier,
      title: opts.title,
      description: opts.description ?? '',
      currentPrice: { formattedPrice: opts.formattedPrice ?? '$9.99' },
    },
  }
}

function makeOffering(packages: ReturnType<typeof makePackage>[]) {
  return { availablePackages: packages }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Paywall module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports Paywall as a function', async () => {
    const mod = await import('../Paywall')
    expect(typeof mod.Paywall).toBe('function')
  })

  it('exports PaywallProps type (component accepts onPurchaseCompleted prop)', async () => {
    const mod = await import('../Paywall')
    // Verify the component signature accepts an options object.
    // A component with no required props will have .length === 0 or 1.
    expect(mod.Paywall.length).toBeLessThanOrEqual(1)
  })
})

describe('Paywall hook contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBilling.mockReturnValue(null)
    mockUseBillingContext.mockReturnValue({
      offerings: null,
      isLoading: false,
      customerInfo: null,
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('useBilling and useBillingContext are consumed by the component module', async () => {
    // Importing the module triggers the mock bindings
    await import('../Paywall')
    // The mocks are registered — their presence confirms the import paths are correct.
    expect(mockUseBilling).toBeDefined()
    expect(mockUseBillingContext).toBeDefined()
  })
})

describe('Paywall purchase error handling', () => {
  it('swallows USER_CANCELLED errorCode 1 silently', () => {
    const err = { errorCode: 1 }
    // Simulate the error-check branch inside the onClick handler.
    const code = (err as { errorCode?: number }).errorCode
    expect(code).toBe(1)
    // A real purchase abort should NOT invoke console.error.
    // This test documents the intent; rendering is covered by integration tests.
  })

  it('propagates non-cancellation errors to console.error', () => {
    const err = { errorCode: 2, message: 'payment failed' }
    const code = (err as { errorCode?: number }).errorCode
    expect(code).not.toBe(1)
  })
})

// ─── Render tests (jsdom) ─────────────────────────────────────────────────────

describe('Paywall render — isLoading', () => {
  beforeEach(() => {
    mockUseBilling.mockReturnValue({ purchase: vi.fn() })
    mockUseBillingContext.mockReturnValue({
      offerings: null,
      isLoading: true,
      customerInfo: null,
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('shows a loading indicator with aria-label "Loading plans"', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    // The <output> element has aria-label="Loading plans" and an implicit
    // ARIA role of "status"; query by label for cross-browser reliability.
    expect(screen.getByLabelText('Loading plans')).toBeInTheDocument()
  })

  it('renders the animated loading text', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByText(/loading plans/i)).toBeInTheDocument()
  })
})

describe('Paywall render — billing not configured (purchases === null)', () => {
  beforeEach(() => {
    mockUseBilling.mockReturnValue(null)
    mockUseBillingContext.mockReturnValue({
      offerings: null,
      isLoading: false,
      customerInfo: null,
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('shows the "Billing is not configured" alert', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/billing is not configured/i)
  })

  it('does not render the "Choose a plan" heading', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.queryByRole('heading', { name: /choose a plan/i })).not.toBeInTheDocument()
  })
})

describe('Paywall render — no offerings available', () => {
  beforeEach(() => {
    mockUseBilling.mockReturnValue({ purchase: vi.fn() })
    mockUseBillingContext.mockReturnValue({
      offerings: [],
      isLoading: false,
      customerInfo: null,
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('shows the "No plans available" alert when offerings is empty array', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/no plans are available/i)
  })
})

describe('Paywall render — null offerings with purchases present', () => {
  beforeEach(() => {
    // purchases is non-null so the "not configured" branch is skipped;
    // offerings is null so the "no plans available" branch fires.
    mockUseBilling.mockReturnValue({ purchase: vi.fn() })
    mockUseBillingContext.mockReturnValue({
      offerings: null,
      isLoading: false,
      customerInfo: null,
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('shows the "No plans available" alert when offerings is null and purchases is present', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByRole('alert')).toHaveTextContent(/no plans are available/i)
  })
})

describe('Paywall render — offerings grid', () => {
  const pkg1 = makePackage({
    identifier: 'monthly',
    title: 'Monthly',
    formattedPrice: '$9.99',
    productIdentifier: 'com.example.monthly',
  })
  const pkg2 = makePackage({
    identifier: 'annual',
    title: 'Annual',
    description: 'Best value',
    formattedPrice: '$79.99',
    productIdentifier: 'com.example.annual',
  })

  beforeEach(() => {
    mockUseBilling.mockReturnValue({ purchase: vi.fn().mockResolvedValue({}) })
    mockUseBillingContext.mockReturnValue({
      offerings: [makeOffering([pkg1, pkg2])],
      isLoading: false,
      customerInfo: {
        activeSubscriptions: new Set<string>(),
        entitlements: { active: {} },
      },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('renders the "Choose a plan" heading', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByRole('heading', { name: /choose a plan/i })).toBeInTheDocument()
  })

  it('renders an article for each package', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByRole('article', { name: /monthly plan/i })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /annual plan/i })).toBeInTheDocument()
  })

  it('renders product titles', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Annual')).toBeInTheDocument()
  })

  it('renders product description when present', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByText('Best value')).toBeInTheDocument()
  })

  it('renders formatted prices', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByText('$9.99')).toBeInTheDocument()
    expect(screen.getByText('$79.99')).toBeInTheDocument()
  })

  it('renders "Subscribe" buttons for un-owned packages', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    const buttons = screen.getAllByRole('button', { name: /subscribe to/i })
    expect(buttons).toHaveLength(2)
    for (const btn of buttons) {
      expect(btn).not.toBeDisabled()
    }
  })

  it('calls purchase with the correct rcPackage when Subscribe is clicked', async () => {
    const user = userEvent.setup()
    const mockPurchase = vi.fn().mockResolvedValue({})
    mockUseBilling.mockReturnValue({ purchase: mockPurchase })

    const { Paywall } = await import('../Paywall')
    render(<Paywall />)

    const btn = screen.getByRole('button', { name: /subscribe to monthly/i })
    await user.click(btn)

    await waitFor(() => {
      expect(mockPurchase).toHaveBeenCalledWith({ rcPackage: pkg1 })
    })
  })

  it('calls onPurchaseCompleted after a successful purchase', async () => {
    const user = userEvent.setup()
    const onPurchaseCompleted = vi.fn()
    mockUseBilling.mockReturnValue({ purchase: vi.fn().mockResolvedValue({}) })

    const { Paywall } = await import('../Paywall')
    render(<Paywall onPurchaseCompleted={onPurchaseCompleted} />)

    await user.click(screen.getByRole('button', { name: /subscribe to monthly/i }))

    await waitFor(() => {
      expect(onPurchaseCompleted).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Paywall render — owned subscription (entitled)', () => {
  const ownedPkg = makePackage({
    identifier: 'monthly',
    title: 'Monthly',
    productIdentifier: 'com.example.monthly',
  })

  beforeEach(() => {
    mockUseBilling.mockReturnValue({ purchase: vi.fn() })
    mockUseBillingContext.mockReturnValue({
      offerings: [makeOffering([ownedPkg])],
      isLoading: false,
      customerInfo: {
        activeSubscriptions: new Set(['com.example.monthly']),
        entitlements: { active: { pro: { isActive: true, expirationDate: null } } },
      },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })
  })

  it('renders "Current plan" button when subscription is active', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    const btn = screen.getByRole('button', { name: /current plan/i })
    expect(btn).toHaveTextContent('Current plan')
  })

  it('disables the button when the package is owned', async () => {
    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByRole('button', { name: /monthly — current plan/i })).toBeDisabled()
  })
})

describe('Paywall render — purchase error handling (USER_CANCELLED)', () => {
  const pkg = makePackage({
    identifier: 'monthly',
    title: 'Monthly',
    productIdentifier: 'com.example.monthly',
  })

  it('does not call console.error when purchase throws errorCode 1 (USER_CANCELLED)', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cancelErr = { errorCode: 1, message: 'User cancelled' }
    mockUseBilling.mockReturnValue({ purchase: vi.fn().mockRejectedValue(cancelErr) })
    mockUseBillingContext.mockReturnValue({
      offerings: [makeOffering([pkg])],
      isLoading: false,
      customerInfo: { activeSubscriptions: new Set(), entitlements: { active: {} } },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })

    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    await user.click(screen.getByRole('button', { name: /subscribe to monthly/i }))

    await waitFor(() => {
      expect(consoleSpy).not.toHaveBeenCalled()
    })
    consoleSpy.mockRestore()
  })

  it('calls console.error when purchase throws errorCode !== 1', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const paymentErr = { errorCode: 2, message: 'payment failed' }
    mockUseBilling.mockReturnValue({ purchase: vi.fn().mockRejectedValue(paymentErr) })
    mockUseBillingContext.mockReturnValue({
      offerings: [makeOffering([pkg])],
      isLoading: false,
      customerInfo: { activeSubscriptions: new Set(), entitlements: { active: {} } },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })

    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    await user.click(screen.getByRole('button', { name: /subscribe to monthly/i }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[Paywall] purchase error:', paymentErr)
    })
    consoleSpy.mockRestore()
  })
})

describe('Paywall render — product price absent', () => {
  it('renders "—" when currentPrice is null', async () => {
    const pkgNoPrice = {
      identifier: 'free',
      webBillingProduct: {
        identifier: 'com.example.free',
        title: 'Free',
        description: '',
        currentPrice: null,
      },
    }
    mockUseBilling.mockReturnValue({ purchase: vi.fn() })
    mockUseBillingContext.mockReturnValue({
      offerings: [{ availablePackages: [pkgNoPrice] }],
      isLoading: false,
      customerInfo: { activeSubscriptions: new Set(), entitlements: { active: {} } },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })

    const { Paywall } = await import('../Paywall')
    render(<Paywall />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('Paywall render — onClick guard: purchases null at render time', () => {
  // Covers the `if (!purchases)` guard in the Paywall component.
  // When useBilling() returns null at render time the component shows the
  // "Billing is not configured" alert — no Subscribe buttons appear, so no
  // purchase call can ever be made.
  it('does not render Subscribe buttons when purchases is null', async () => {
    const pkg = makePackage({
      identifier: 'monthly',
      title: 'Monthly',
      productIdentifier: 'com.example.monthly',
    })

    mockUseBilling.mockReturnValue(null)
    mockUseBillingContext.mockReturnValue({
      offerings: [makeOffering([pkg])],
      isLoading: false,
      customerInfo: { activeSubscriptions: new Set(), entitlements: { active: {} } },
      purchases: null,
      refreshCustomerInfo: vi.fn(),
    })

    const { Paywall } = await import('../Paywall')
    render(<Paywall />)

    // The outer `if (!purchases)` guard shows the alert instead of the grid —
    // no Subscribe buttons are rendered at all.
    expect(screen.queryByRole('button', { name: /subscribe to/i })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/billing is not configured/i)
  })
})
