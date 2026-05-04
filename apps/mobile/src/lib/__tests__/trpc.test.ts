import { describe, expect, it, vi } from 'vitest'
import { getTrpcUrl } from '../trpc'

// Mock composition and container
vi.mock('../composition', () => ({
  getContainer: vi.fn(() => ({
    resolve: vi.fn((key) => {
      if (key === 'CONFIG') {
        return {
          client: { trpcUrl: 'https://api.test/trpc' },
        }
      }
      return null
    }),
  })),
}))

// Mock dependencyKeys
vi.mock('@t/dependency-injection', () => ({
  dependencyKeys: {
    global: {
      CONFIG: 'CONFIG',
    },
  },
}))

// Mock @trpc/react-query
vi.mock('@trpc/react-query', () => ({
  createTRPCReact: vi.fn(() => ({})),
}))

describe('trpc lib', () => {
  describe('getTrpcUrl', () => {
    it('returns the URL from config', () => {
      expect(getTrpcUrl()).toBe('https://api.test/trpc')
    })
  })
})
