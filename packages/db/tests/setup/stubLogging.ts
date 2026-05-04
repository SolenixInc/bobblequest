import { vi } from 'vitest'

// `@t/db` itself doesn't log today, but the stub keeps the test setup
// uniform with sibling packages so future loggerFactory wiring drops
// in without a harness change.
vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    warning: () => {},
    error: () => {},
  }),
}))
