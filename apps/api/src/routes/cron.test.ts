import type { AwilixContainer } from '@t/dependency-injection'
import type { Logger } from '@t/logging'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCronApp } from './cron'

const EXPECTED_SECRET = 'shh-cron-secret-42'

function buildFakeContainer({ cronSecret = EXPECTED_SECRET }: { cronSecret?: string } = {}) {
  const mockLogger: Partial<Logger> = {
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }

  const mockConfig = {
    system: {
      cronSecret,
    },
  }

  const container = {
    resolve: vi.fn((token: string) => {
      if (token === 'config') return mockConfig
      if (token === 'logger') return mockLogger
      throw new Error(`Unknown token: ${token}`)
    }),
  } as unknown as AwilixContainer

  return { container, mockConfig, mockLogger }
}

function post(app: ReturnType<typeof createCronApp>, headerValue?: string) {
  const headers: Record<string, string> = {}
  if (headerValue !== undefined) {
    headers['x-cron-secret'] = headerValue
  }
  return app.request('/', { method: 'POST', headers })
}

describe('createCronApp', () => {
  let app: ReturnType<typeof createCronApp>
  let mockLogger: Partial<Logger>

  beforeEach(() => {
    const built = buildFakeContainer()
    mockLogger = built.mockLogger
    app = createCronApp(built.container)
  })

  it('returns 200 when x-cron-secret matches', async () => {
    const res = await post(app, EXPECTED_SECRET)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('[cron] job triggered') }),
      '',
    )
  })

  it('returns 403 when x-cron-secret is missing', async () => {
    const res = await post(app)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(mockLogger.warning).toHaveBeenCalled()
  })

  it('returns 403 when x-cron-secret is wrong', async () => {
    const res = await post(app, 'wrong-secret')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(mockLogger.warning).toHaveBeenCalled()
  })

  it('returns 403 when x-cron-secret has wrong length (timing-safe path)', async () => {
    const res = await post(app, 'short')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ ok: false })
    expect(mockLogger.warning).toHaveBeenCalled()
  })
})
