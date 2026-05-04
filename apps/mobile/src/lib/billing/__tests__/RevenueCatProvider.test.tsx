/**
 * Smoke test: RevenueCatProvider module exports + no-op behavior when RC keys are absent.
 *
 * react-native-purchases is mocked so no native module is required.
 * Uses vitest without @testing-library/react-native so the test runs in node env.
 */
import { act, render, renderHook } from '@testing-library/react'
import type { Container } from '@t/dependency-injection'
import type * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import of the module under test
// ---------------------------------------------------------------------------
vi.mock('react-native-purchases', () => ({
  default: {
    configure: vi.fn(),
    setLogLevel: vi.fn(),
    getCustomerInfo: vi.fn().mockResolvedValue({ activeSubscriptions: [] }),
    logIn: vi.fn().mockResolvedValue({ customerInfo: { activeSubscriptions: ['pro'] } }),
    logOut: vi.fn().mockResolvedValue({ activeSubscriptions: [] }),
    addCustomerInfoUpdateListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}))

vi.mock('react-native-purchases-ui', () => ({
  default: {
    Paywall: () => null,
  },
  PAYWALL_RESULT: {
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
    NOT_PRESENTED: 'NOT_PRESENTED',
    ERROR: 'ERROR',
    CANCELLED: 'CANCELLED',
  },
}))

vi.mock('@clerk/clerk-expo', () => ({
  useUser: vi.fn(() => ({ user: null })),
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: { create: (s: unknown) => s },
  View: () => null,
}))

vi.mock('../../composition', () => ({
  getContainer: vi.fn(() => ({
    resolve: vi.fn(() => ({
      revenueCat: { appleApiKey: '', googleApiKey: '' },
    })),
  })),
}))

vi.mock('@t/dependency-injection', () => ({
  dependencyKeys: { global: { CONFIG: 'config' } },
}))

// ---------------------------------------------------------------------------
// Tests — import after mocks are declared
// ---------------------------------------------------------------------------
describe('RevenueCatProvider module', () => {
  it('exports RevenueCatProvider as a function', async () => {
    const mod = await import('../RevenueCatProvider')
    expect(typeof mod.RevenueCatProvider).toBe('function')
  })

  it('exports useRcCustomerInfo as a function', async () => {
    const mod = await import('../RevenueCatProvider')
    expect(typeof mod.useRcCustomerInfo).toBe('function')
  })
})

describe('RevenueCatProvider key selection', () => {
  it('no-ops when EXPO_PUBLIC_REVENUECAT_APPLE_KEY is absent', async () => {
    // Keys default to empty string — RC_ENABLED should be false
    const Purchases = (await import('react-native-purchases')).default
    // configure must NOT have been called on a fresh import with no keys
    expect(Purchases.configure).not.toHaveBeenCalled()
  })
})

describe('RevenueCatProvider rendering', () => {
  it('renders children when RC keys are absent (no-op path)', async () => {
    const { RevenueCatProvider } = await import('../RevenueCatProvider')

    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <RevenueCatProvider>
          <span data-testid="child">content</span>
        </RevenueCatProvider>,
      )
      container = result.container
    })

    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('renders children when RC key is present (configured path)', async () => {
    const { getContainer } = await import('../../composition')
    const mockResolve = vi.fn(() => ({
      revenueCat: { appleApiKey: 'rc_apple_key', googleApiKey: '' },
    }))
    vi.mocked(getContainer).mockReturnValue({
      resolve: mockResolve,
      register: vi.fn(),
    } as unknown as Container)

    const { RevenueCatProvider } = await import('../RevenueCatProvider')

    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <RevenueCatProvider>
          <span data-testid="rc-child">rc content</span>
        </RevenueCatProvider>,
      )
      container = result.container
    })

    expect(container.querySelector('[data-testid="rc-child"]')).not.toBeNull()
  })

  it('calls Purchases.configure when a valid API key is provided', async () => {
    const Purchases = (await import('react-native-purchases')).default
    vi.mocked(Purchases.configure).mockClear()

    const { getContainer } = await import('../../composition')
    vi.mocked(getContainer).mockReturnValue({
      resolve: vi.fn(() => ({
        revenueCat: { appleApiKey: 'rc_apple_key', googleApiKey: '' },
      })),
      register: vi.fn(),
    } as unknown as Container)

    const { RevenueCatProvider } = await import('../RevenueCatProvider')

    await act(async () => {
      render(
        <RevenueCatProvider>
          <span>child</span>
        </RevenueCatProvider>,
      )
    })

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rc_apple_key' })
  })

  it('calls Purchases.logIn when a user is present after configure', async () => {
    const { useUser } = await import('@clerk/clerk-expo')
    vi.mocked(useUser).mockReturnValue({ user: { id: 'user_123' } } as ReturnType<typeof useUser>)

    const Purchases = (await import('react-native-purchases')).default
    vi.mocked(Purchases.configure).mockClear()
    vi.mocked(Purchases.logIn).mockClear()

    const { getContainer } = await import('../../composition')
    vi.mocked(getContainer).mockReturnValue({
      resolve: vi.fn(() => ({
        revenueCat: { appleApiKey: 'rc_apple_key', googleApiKey: '' },
      })),
      register: vi.fn(),
    } as unknown as Container)

    const { RevenueCatProvider } = await import('../RevenueCatProvider')

    await act(async () => {
      render(
        <RevenueCatProvider>
          <span>child</span>
        </RevenueCatProvider>,
      )
    })

    expect(Purchases.logIn).toHaveBeenCalledWith('user_123')
  })

  it('uses googleApiKey on Android platform', async () => {
    // Mutate the aliased mock's Platform.OS to simulate Android.
    const rn = await import('react-native')
    ;(rn.Platform as { OS: string }).OS = 'android'

    const Purchases = (await import('react-native-purchases')).default
    vi.mocked(Purchases.configure).mockClear()

    const { getContainer } = await import('../../composition')
    vi.mocked(getContainer).mockReturnValue({
      resolve: vi.fn(() => ({
        revenueCat: { appleApiKey: '', googleApiKey: 'rc_android_key' },
      })),
      register: vi.fn(),
    } as unknown as Container)

    const { RevenueCatProvider } = await import('../RevenueCatProvider')

    await act(async () => {
      render(
        <RevenueCatProvider>
          <span>child</span>
        </RevenueCatProvider>,
      )
    })

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'rc_android_key' })

    // Restore to iOS for subsequent tests.
    ;(rn.Platform as { OS: string }).OS = 'ios'
  })
})

describe('useRcCustomerInfo', () => {
  it('returns null when no customer info is set (default context value)', async () => {
    const { useRcCustomerInfo, RevenueCatProvider } = await import('../RevenueCatProvider')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RevenueCatProvider>{children}</RevenueCatProvider>
    )

    const { result } = renderHook(() => useRcCustomerInfo(), { wrapper })

    // Default value is null before any RC fetch resolves
    expect(result.current).toBeNull()
  })
})
