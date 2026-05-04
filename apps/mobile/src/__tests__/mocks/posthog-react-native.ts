import { vi } from 'vitest'

export const PostHog = vi.fn().mockImplementation(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  screen: vi.fn(),
  group: vi.fn(),
  alias: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlags: vi.fn(),
  shutdown: vi.fn().mockResolvedValue(undefined),
  getSessionId: vi.fn().mockReturnValue('session-id'),
}))

export default PostHog
