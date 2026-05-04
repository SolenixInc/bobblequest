import { describe, expect, it, vi } from 'vitest'
import { getClerkPublishableKey } from '../clerk'

// Mock composition and container
vi.mock('../composition', () => ({
  getContainer: vi.fn(() => ({
    resolve: vi.fn((key) => {
      if (key === 'CONFIG') {
        return {
          auth: { clerkPublishableKey: 'test_clerk_key' },
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

// Mock Clerk Expo
vi.mock('@clerk/clerk-expo', () => ({
  ClerkProvider: () => null,
  SignedIn: () => null,
  SignedOut: () => null,
  useAuth: vi.fn(),
  useUser: vi.fn(),
}))

vi.mock('@clerk/clerk-expo/token-cache', () => ({
  tokenCache: {},
}))

describe('clerk lib', () => {
  describe('getClerkPublishableKey', () => {
    it('returns the key from config', () => {
      expect(getClerkPublishableKey()).toBe('test_clerk_key')
    })
  })
})
