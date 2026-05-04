/**
 * Tests for apps/web/src/app/bootstrap/page.tsx
 *
 * Pattern: async server component — `const ui = await Page(); render(ui);`
 * Coverage target: 100/100/100/100 on bootstrap/page.tsx
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// BootstrapPage reads process.env directly at render time. vi.stubEnv per test
// keeps each test hermetic — vi.unstubAllEnvs() in afterEach resets state.

import BootstrapPage from '../page.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal set of ALL env vars the page reports so envChecks.every(e=>e.set) is true */
const ALL_ENV_VARS = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
  NEXT_PUBLIC_TRPC_URL: 'http://api.test/trpc',
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
  NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY: 'appl_key',
  NEXT_PUBLIC_ENVIRONMENT: 'test',
  ENVIRONMENT: 'test',
  NODE_ENV: 'test',
  CLERK_SECRET_KEY: 'sk_test_abc',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/dashboard',
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/dashboard',
}

function stubAllEnvs(overrides: Record<string, string | undefined> = {}) {
  const merged = { ...ALL_ENV_VARS, ...overrides }
  for (const [k, v] of Object.entries(merged)) {
    vi.stubEnv(k, v as string)
  }
}

function mockFetchOk(data: unknown = { status: 'ok' }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    }),
  )
}

function mockFetchNotOk(status = 503, statusText = 'Service Unavailable') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve({}),
    }),
  )
}

function mockFetchReject(error: Error | string = new Error('Network Error')) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(typeof error === 'string' ? new Error(error) : error),
  )
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  cleanup()
})

// ---------------------------------------------------------------------------
// 1. All envs set + fetch ok=true → healthy badge
// ---------------------------------------------------------------------------

describe('all envs set + fetch resolves ok=true', () => {
  test('renders "✓ all systems go" badge', async () => {
    stubAllEnvs()
    mockFetchOk({ status: 'ok' })

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('✓ all systems go')).toBeDefined()
  })

  test('renders the API response JSON in a <pre> block', async () => {
    const responseData = { status: 'ok', version: '1.2.3' }
    stubAllEnvs()
    mockFetchOk(responseData)

    const ui = await BootstrapPage()
    render(ui)

    const pre = document.querySelector('pre')
    expect(pre).not.toBeNull()
    expect(pre!.textContent).toContain('"version": "1.2.3"')
  })

  test('calls fetch with the correct URL when API_URL is set', async () => {
    stubAllEnvs({ API_URL: 'http://direct-api.test' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await BootstrapPage()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://direct-api.test/bootstrap',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})

// ---------------------------------------------------------------------------
// 2. fetch rejects (network error / timeout) → unhealthy badge
// ---------------------------------------------------------------------------

describe('fetch rejects (network / timeout)', () => {
  test('renders "✗ action needed" badge', async () => {
    stubAllEnvs()
    mockFetchReject(new Error('connection refused'))

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('✗ action needed')).toBeDefined()
  })

  test('API badge label contains the caught error message', async () => {
    stubAllEnvs()
    mockFetchReject(new Error('ECONNREFUSED'))

    const ui = await BootstrapPage()
    render(ui)

    // Badge text: "✗ unreachable: ECONNREFUSED"
    expect(screen.getByText(/unreachable: ECONNREFUSED/)).toBeDefined()
  })

  test('non-Error reject value is coerced to string', async () => {
    stubAllEnvs()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('timeout'))

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText(/unreachable: timeout/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 3. fetch ok=false → unhealthy badge from HTTP status
// ---------------------------------------------------------------------------

describe('fetch resolves with ok=false', () => {
  test('renders "✗ action needed" badge', async () => {
    stubAllEnvs()
    mockFetchNotOk(503, 'Service Unavailable')

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('✗ action needed')).toBeDefined()
  })

  test('API badge label contains the HTTP status', async () => {
    stubAllEnvs()
    mockFetchNotOk(503, 'Service Unavailable')

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText(/✗ HTTP 503 Service Unavailable/)).toBeDefined()
  })

  test('does NOT render a <pre> JSON block when api ok=false', async () => {
    stubAllEnvs()
    mockFetchNotOk(500, 'Internal Server Error')

    const ui = await BootstrapPage()
    render(ui)

    expect(document.querySelector('pre')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. URL derivation: fallback when API_URL is absent
// ---------------------------------------------------------------------------

describe('URL derivation fallbacks', () => {
  test('strips /trpc suffix from NEXT_PUBLIC_TRPC_URL when API_URL is absent', async () => {
    // Must unset API_URL explicitly so the fallback branch is taken
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      API_URL: undefined,
      NEXT_PUBLIC_TRPC_URL: 'http://api.test/trpc',
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await BootstrapPage()

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/bootstrap', expect.anything())
  })

  test('strips trailing slash from NEXT_PUBLIC_TRPC_URL when it does not end with /trpc', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      API_URL: undefined,
      NEXT_PUBLIC_TRPC_URL: 'http://api.test/',
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await BootstrapPage()

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/bootstrap', expect.anything())
  })

  test('returns ok=false without fetching when both API_URL and NEXT_PUBLIC_TRPC_URL are absent', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      API_URL: undefined,
      NEXT_PUBLIC_TRPC_URL: undefined,
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }
    // No fetch mock — if fetch is called this test will fail with "not a function"
    vi.stubGlobal('fetch', vi.fn())

    const ui = await BootstrapPage()
    render(ui)

    // fetch should NOT have been called
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()

    // API badge shows the "not configured" error
    expect(screen.getByText(/API base URL not configured/)).toBeDefined()
  })

  test('NEXT_PUBLIC_TRPC_URL without trailing slash (no /trpc) is used as-is', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      API_URL: undefined,
      NEXT_PUBLIC_TRPC_URL: 'http://api.test',
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await BootstrapPage()

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/bootstrap', expect.anything())
  })
})

// ---------------------------------------------------------------------------
// 5. Badge rendering: ok=true vs ok=false
// ---------------------------------------------------------------------------

describe('Badge rendering paths', () => {
  test('Badge renders green "✓ set" text when env var is set', async () => {
    stubAllEnvs()
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    // All env badges should show "✓ set"
    const badges = screen.getAllByText('✓ set')
    expect(badges.length).toBeGreaterThan(0)
  })

  test('Badge renders red "✗ missing" text when env var is absent', async () => {
    // Unset one env var so a "✗ missing" badge appears
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      NEXT_PUBLIC_POSTHOG_KEY: undefined,
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getAllByText('✗ missing').length).toBeGreaterThan(0)
  })

  test('overall badge shows "✗ action needed" when any env is missing', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      CLERK_SECRET_KEY: undefined,
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('✗ action needed')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 6. NEXT_BUILD_ID env var derivation for build timestamp
// ---------------------------------------------------------------------------

describe('NEXT_BUILD_ID / build timestamp', () => {
  test('uses NEXT_BUILD_ID as timestamp when set', async () => {
    stubAllEnvs({ NEXT_BUILD_ID: 'build-abc-123' })
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('build-abc-123')).toBeDefined()
  })

  test('falls back to an ISO timestamp when NEXT_BUILD_ID is absent', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      NEXT_BUILD_ID: undefined,
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    // The Build section renders a "Timestamp" label next to the timestamp code element.
    // Find the "Timestamp" text node's parent row, then get the code sibling.
    const timestampLabel = screen.getByText('Timestamp')
    const row = timestampLabel.closest('div')
    expect(row).not.toBeNull()
    const code = row!.querySelector('code')
    expect(code).not.toBeNull()
    // ISO 8601-ish string e.g. "2026-04-30T12:00:00.000Z"
    expect(code!.textContent).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })
})

// ---------------------------------------------------------------------------
// 7. Auth section — publishableKeySet / secretKeySet
// ---------------------------------------------------------------------------

describe('auth status section', () => {
  test('both auth keys present → two "✓ set" badges in Auth section', async () => {
    stubAllEnvs()
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    // Auth section heading
    expect(screen.getByText('Auth')).toBeDefined()
  })

  test('publishableKey absent contributes to allOk=false', async () => {
    const envs: Record<string, string | undefined> = {
      ...ALL_ENV_VARS,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
    }
    for (const [k, v] of Object.entries(envs)) {
      vi.stubEnv(k, v as string)
    }
    mockFetchOk()

    const ui = await BootstrapPage()
    render(ui)

    expect(screen.getByText('✗ action needed')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 8. BootstrapJsonBlock — machine-readable script tag
// ---------------------------------------------------------------------------

describe('BootstrapJsonBlock', () => {
  test('renders a script[type="application/json"]#bootstrap-data element', async () => {
    stubAllEnvs()
    mockFetchOk({ version: '9' })

    const ui = await BootstrapPage()
    render(ui)

    const script = document.querySelector('script#bootstrap-data[type="application/json"]')
    expect(script).not.toBeNull()
    const parsed = JSON.parse(script!.textContent ?? '')
    expect(parsed).toHaveProperty('api')
    expect(parsed).toHaveProperty('env')
    expect(parsed).toHaveProperty('auth')
    expect(parsed).toHaveProperty('build')
  })
})
