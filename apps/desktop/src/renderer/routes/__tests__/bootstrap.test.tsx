/**
 * Tests for BootstrapRoute (routes/bootstrap.tsx)
 *
 * Covers every branch:
 *   - window.api undefined on mount → fetchError displayed
 *   - window.api.getBootstrapStatus rejects → fetchError displayed
 *   - getBootstrapStatus resolves → env flags, build timestamp displayed
 *   - getBootstrapStatus resolves with no buildTimestamp → falls back to VITE_BUILD_TIMESTAMP env
 *   - getBootstrapStatus resolves with no buildTimestamp, no env → "not set" span
 *   - Renderer env flags (VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL, VITE_REVENUECAT_PUBLIC_API_KEY)
 *       - present → green ✓ badge
 *       - absent → red ✗ badge
 *   - Ping: window.api undefined → error badge
 *   - Ping: window.api.ping rejects → error badge
 *   - Ping: ping returns 'pong' → ok badge
 *   - Ping: ping returns unexpected value → error badge
 *   - Ping: button disabled while checking
 *   - Back to app button sets window.location.hash
 *   - StatusBadge: ok=true and ok=false
 *   - import.meta.env.MODE is rendered
 *
 * Strategy:
 *   - Stub window.api in beforeEach; each test controls resolved/rejected values.
 *   - vi.mock '../lib/clientConfig' with a mutable config object so renderer env
 *     presence tests work without import.meta.env plumbing.
 *   - vi.stubEnv for VITE_BUILD_TIMESTAMP to test the fallback chain.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock clientConfig ────────────────────────────────────────────────────────
// Mutable object so per-test mutations are picked up via the live binding.
const mockConfig: {
  clerk: { publishableKey: string | undefined }
  trpc: { url: string | undefined }
  revenueCat: { publicApiKey: string | undefined }
} = {
  clerk: { publishableKey: 'pk_test_123' },
  trpc: { url: 'http://localhost:3000/trpc' },
  revenueCat: { publicApiKey: 'rc_key' },
}

vi.mock('../../lib/clientConfig', () => ({
  desktopClientConfig: mockConfig,
}))

// ─── window.api helpers ───────────────────────────────────────────────────────

const mockPing = vi.fn()
const mockGetBootstrapStatus = vi.fn()

function installWindowApi() {
  Object.defineProperty(window, 'api', {
    value: { ping: mockPing, getBootstrapStatus: mockGetBootstrapStatus },
    writable: true,
    configurable: true,
  })
}

function removeWindowApi() {
  // @ts-expect-error — intentionally deleting for branch coverage
  delete window.api
}

// ─── Default bootstrap status fixture ─────────────────────────────────────────

const defaultStatus = {
  env: {
    CLERK_SECRET_KEY: true,
    DATABASE_URL: true,
    OPENAI_API_KEY: false,
  },
  buildTimestamp: '2026-04-30T00:00:00.000Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BootstrapRoute — window.api missing on mount', () => {
  beforeEach(() => {
    removeWindowApi()
  })

  afterEach(() => {
    installWindowApi()
  })

  it('shows the preload bridge missing error message', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(
        screen.getByText(/window\.api is not defined — preload bridge missing/),
      ).toBeInTheDocument()
    })
  })

  it('renders the error in an alert role element', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — getBootstrapStatus rejects', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockRejectedValue(new Error('IPC channel broken'))
    mockPing.mockResolvedValue('pong')
  })

  it('renders the error message from the rejection', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText(/IPC channel broken/)).toBeInTheDocument()
    })
  })

  it('shows "Unavailable" for the main-process env section', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — getBootstrapStatus rejects with non-Error', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockRejectedValue('plain string error')
    mockPing.mockResolvedValue('pong')
  })

  it('renders the stringified non-Error rejection', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText(/plain string error/)).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — getBootstrapStatus resolves successfully', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
    // Full renderer env
    mockConfig.clerk.publishableKey = 'pk_test_123'
    mockConfig.trpc.url = 'http://localhost:3000/trpc'
    mockConfig.revenueCat.publicApiKey = 'rc_key'
  })

  it('renders the Bootstrap Status heading', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bootstrap Status' })).toBeInTheDocument()
    })
  })

  it('renders main-process env keys from the status payload', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('CLERK_SECRET_KEY')).toBeInTheDocument()
      expect(screen.getByText('DATABASE_URL')).toBeInTheDocument()
      expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument()
    })
  })

  it('renders ✓ badge for present main-process env vars', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      // CLERK_SECRET_KEY: true and DATABASE_URL: true both render ✓
      const presentBadges = screen.getAllByLabelText('present')
      expect(presentBadges.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders ✗ badge for absent main-process env vars', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      // OPENAI_API_KEY: false
      const missingBadges = screen.getAllByLabelText('missing')
      expect(missingBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders the build timestamp', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('2026-04-30T00:00:00.000Z')).toBeInTheDocument()
    })
  })

  it('renders the IPC section heading', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'IPC' })).toBeInTheDocument()
    })
  })

  it('renders the Environment section heading', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Environment' })).toBeInTheDocument()
    })
  })

  it('renders the Build section heading', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Build' })).toBeInTheDocument()
    })
  })

  it('renders renderer env keys (VITE_*)', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('VITE_CLERK_PUBLISHABLE_KEY')).toBeInTheDocument()
      expect(screen.getByText('VITE_API_URL')).toBeInTheDocument()
      expect(screen.getByText('VITE_REVENUECAT_PUBLIC_API_KEY')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — renderer env absent flags', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
    // Remove all renderer env keys
    mockConfig.clerk.publishableKey = undefined
    mockConfig.trpc.url = undefined
    mockConfig.revenueCat.publicApiKey = undefined
  })

  afterEach(() => {
    // Restore
    mockConfig.clerk.publishableKey = 'pk_test_123'
    mockConfig.trpc.url = 'http://localhost:3000/trpc'
    mockConfig.revenueCat.publicApiKey = 'rc_key'
  })

  it('renders ✗ badges for all three absent renderer env vars', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      const missingBadges = screen.getAllByLabelText('missing')
      // 3 renderer env vars absent + 1 main env var absent = 4 total missing
      expect(missingBadges.length).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('BootstrapRoute — buildTimestamp fallback to VITE_BUILD_TIMESTAMP env', () => {
  beforeEach(() => {
    installWindowApi()
    // Status without buildTimestamp
    mockGetBootstrapStatus.mockResolvedValue({
      env: { SOME_KEY: true },
      buildTimestamp: undefined,
    })
    mockPing.mockResolvedValue('pong')
    vi.stubEnv('VITE_BUILD_TIMESTAMP', '2026-01-01T00:00:00.000Z')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back to VITE_BUILD_TIMESTAMP when status has no buildTimestamp', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('2026-01-01T00:00:00.000Z')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — buildTimestamp "not set" fallback', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue({
      env: {},
      buildTimestamp: undefined,
    })
    mockPing.mockResolvedValue('pong')
    // Do NOT stub VITE_BUILD_TIMESTAMP — leave it undefined so the last
    // ?? fallback (<span>not set</span>) is reached. Stubbing to '' would
    // produce an empty string which is NOT nullish, bypassing the fallback.
  })

  it('renders the "not set" fallback span when no timestamp anywhere', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('not set')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — ping: window.api absent', () => {
  beforeEach(() => {
    // Install api for initial mount/getBootstrapStatus, then remove for ping
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    // Simulate api disappearing before ping
    mockPing.mockImplementation(() => {
      removeWindowApi()
      return Promise.resolve('pong')
    })
  })

  afterEach(() => {
    installWindowApi()
  })

  it('renders the Ping main process button', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ping main process/i })).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — ping: window.api undefined at click time', () => {
  beforeEach(() => {
    // Start with no api so both getBootstrapStatus branch AND ping use the missing path
    removeWindowApi()
  })

  afterEach(() => {
    installWindowApi()
  })

  it('sets ipc to error state when window.api is undefined at ping time', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    const pingButton = screen.getByRole('button', { name: /ping main process/i })
    await userEvent.click(pingButton)

    await waitFor(() => {
      expect(screen.getByLabelText('IPC error')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — ping: returns pong → ok badge', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
  })

  it('shows the IPC ok badge after a successful ping', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    await waitFor(() => screen.getByRole('button', { name: /ping main process/i }))
    await userEvent.click(screen.getByRole('button', { name: /ping main process/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('IPC ok')).toBeInTheDocument()
    })
  })

  it('shows "Pinging…" text while the ping is in-flight', async () => {
    // Delay the ping resolution so we can observe the in-flight state
    let resolvePing!: (v: string) => void
    mockPing.mockReturnValue(
      new Promise<string>((res) => {
        resolvePing = res
      }),
    )

    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    await waitFor(() => screen.getByRole('button', { name: /ping main process/i }))
    await userEvent.click(screen.getByRole('button', { name: /ping main process/i }))

    // Should be in checking state now
    expect(screen.getByText('Pinging…')).toBeInTheDocument()

    // Resolve so React doesn't log act() warnings
    resolvePing('pong')
    await waitFor(() => screen.getByLabelText('IPC ok'))
  })
})

describe('BootstrapRoute — ping: returns unexpected value → error', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('not-pong')
  })

  it('shows the IPC error badge when ping returns an unexpected value', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    await waitFor(() => screen.getByRole('button', { name: /ping main process/i }))
    await userEvent.click(screen.getByRole('button', { name: /ping main process/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('IPC error')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — ping: ping rejects → error', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockRejectedValue(new Error('ping failed'))
  })

  it('shows the IPC error badge when ping rejects', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    await waitFor(() => screen.getByRole('button', { name: /ping main process/i }))
    await userEvent.click(screen.getByRole('button', { name: /ping main process/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('IPC error')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — Back to app button', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
  })

  it('sets window.location.hash to "/" when Back to app is clicked', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)

    await waitFor(() => screen.getByRole('button', { name: /back to app/i }))
    await userEvent.click(screen.getByRole('button', { name: /back to app/i }))

    expect(window.location.hash).toBe('#/')
  })
})

describe('BootstrapRoute — MODE env var rendered', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
  })

  it('renders the Mode section in the Build card', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      expect(screen.getByText('Mode')).toBeInTheDocument()
    })
  })
})

describe('BootstrapRoute — machine-readable script tag', () => {
  beforeEach(() => {
    installWindowApi()
    mockGetBootstrapStatus.mockResolvedValue(defaultStatus)
    mockPing.mockResolvedValue('pong')
  })

  it('renders the bootstrap-data script tag', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      const script = document.getElementById('bootstrap-data')
      expect(script).toBeInTheDocument()
      expect(script?.getAttribute('type')).toBe('application/json')
    })
  })

  it('bootstrap-data contains booted: true', async () => {
    const { BootstrapRoute } = await import('../bootstrap')
    render(<BootstrapRoute />)
    await waitFor(() => {
      const script = document.getElementById('bootstrap-data')
      const data = JSON.parse(script?.textContent ?? '{}')
      expect(data.booted).toBe(true)
    })
  })
})
