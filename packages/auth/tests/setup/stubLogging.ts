import { vi } from 'vitest'

/**
 * Silence `@t/logging` during unit tests. The real `createGlobalLogger`
 * reaches into config for transports; tests don't care about log output.
 */
vi.mock('@t/logging', () => ({
  createGlobalLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    warning: () => {},
    error: () => {},
  }),
}))
