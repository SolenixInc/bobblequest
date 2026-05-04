// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockConfig = {
  siteUrl: 'https://example.com',
  environment: 'testing',
}

vi.mock('./composition', () => ({
  getConfig: vi.fn(() => mockConfig),
}))

describe('getWebsiteConfig', () => {
  let getConfig: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const composition = await import('./composition')
    getConfig = composition.getConfig as ReturnType<typeof vi.fn>
    getConfig.mockReturnValue(mockConfig)
  })

  it('returns the result from getConfig', async () => {
    const { getWebsiteConfig } = await import('./config')
    const result = getWebsiteConfig()
    expect(result).toBe(mockConfig)
  })

  it('calls getConfig exactly once per invocation', async () => {
    const { getWebsiteConfig } = await import('./config')
    getConfig.mockClear()
    getWebsiteConfig()
    expect(getConfig).toHaveBeenCalledTimes(1)
  })
})
