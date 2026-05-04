import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// The route handler fetches ${NEXT_PUBLIC_API_URL}/health and proxies the
// readiness result. Tests cover: api ok, api non-200, network error, timeout,
// and missing env var.
// ---------------------------------------------------------------------------

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL
  })

  it('returns 200 with { ok: true, api: "ok" } when api responds 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    const { GET } = await import('../route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, api: 'ok' })
  })

  it('fetches the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const { GET } = await import('../route')
    await GET()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/health',
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it('returns 503 with { ok: false, api: "unreachable" } when api responds non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    const { GET } = await import('../route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ ok: false, api: 'unreachable' })
  })

  it('returns 503 when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    const { GET } = await import('../route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ ok: false, api: 'unreachable' })
  })

  it('returns 503 when fetch times out (AbortError)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'AbortError' })),
    )

    const { GET } = await import('../route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ ok: false, api: 'unreachable' })
  })

  it('returns 503 when NEXT_PUBLIC_API_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_API_URL

    const { GET } = await import('../route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ ok: false, api: 'unreachable' })
  })
})
