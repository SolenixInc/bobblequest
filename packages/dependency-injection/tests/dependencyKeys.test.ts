import { describe, expect, test } from 'vitest'
import { dependencyKeys } from '../src/entities/dependencyKeys.ts'

describe('dependencyKeys', () => {
  describe('global tokens — exact shape', () => {
    test('CONFIG is "config"', () => expect(dependencyKeys.global.CONFIG).toBe('config'))
    test('LOGGER_FACTORY is "loggerFactory"', () =>
      expect(dependencyKeys.global.LOGGER_FACTORY).toBe('loggerFactory'))
    test('ANALYTICS is "analytics"', () =>
      expect(dependencyKeys.global.ANALYTICS).toBe('analytics'))
    test('CACHE is "cache"', () => expect(dependencyKeys.global.CACHE).toBe('cache'))
    test('DB is "db"', () => expect(dependencyKeys.global.DB).toBe('db'))
    test('USER_REPOSITORY is "userRepository"', () =>
      expect(dependencyKeys.global.USER_REPOSITORY).toBe('userRepository'))
    test('EMBEDDING_STORE is "embeddingStore"', () =>
      expect(dependencyKeys.global.EMBEDDING_STORE).toBe('embeddingStore'))
    test('BILLING_REPOSITORY is "billingRepository"', () =>
      expect(dependencyKeys.global.BILLING_REPOSITORY).toBe('billingRepository'))
    test('PROJECT_REPOSITORY is "projectRepository"', () =>
      expect(dependencyKeys.global.PROJECT_REPOSITORY).toBe('projectRepository'))
    test('AUTH is "auth"', () => expect(dependencyKeys.global.AUTH).toBe('auth'))
    test('QUEUE is "queue"', () => expect(dependencyKeys.global.QUEUE).toBe('queue'))
    test('LOGGER is "logger"', () => expect(dependencyKeys.global.LOGGER).toBe('logger'))

    test('contains exactly 12 keys', () => {
      expect(Object.keys(dependencyKeys.global)).toHaveLength(12)
    })
  })

  describe('request tokens — exact shape', () => {
    test('REQUEST_ANALYTICS is "requestAnalytics"', () =>
      expect(dependencyKeys.request.REQUEST_ANALYTICS).toBe('requestAnalytics'))

    test('contains exactly 1 key', () => {
      expect(Object.keys(dependencyKeys.request)).toHaveLength(1)
    })
  })

  describe('collision checks', () => {
    test('all global token values are unique strings', () => {
      const vals = Object.values(dependencyKeys.global)
      expect(new Set(vals).size).toBe(vals.length)
      for (const v of vals) expect(typeof v).toBe('string')
    })

    test('no value collision between global and request namespaces', () => {
      const globalVals = new Set(Object.values(dependencyKeys.global))
      for (const v of Object.values(dependencyKeys.request)) {
        expect(globalVals.has(v)).toBe(false)
      }
    })
  })

  describe('as const immutability', () => {
    // `as const` is a TypeScript-only compile-time guarantee; there is no
    // Object.freeze call at runtime, so Object.isFrozen returns false.
    // The runtime contract is enforced solely by TypeScript's readonly
    // inference — mutation attempts are caught by the type checker, not at
    // runtime. We document this explicitly and assert the shape instead.
    test('global namespace is an object with string values (runtime shape guard)', () => {
      expect(typeof dependencyKeys.global).toBe('object')
      for (const v of Object.values(dependencyKeys.global)) {
        expect(typeof v).toBe('string')
      }
    })

    test('request namespace is an object with string values (runtime shape guard)', () => {
      expect(typeof dependencyKeys.request).toBe('object')
      for (const v of Object.values(dependencyKeys.request)) {
        expect(typeof v).toBe('string')
      }
    })
  })
})
