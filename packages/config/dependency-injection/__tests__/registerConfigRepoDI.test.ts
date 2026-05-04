import { createContainer, dependencyKeys } from '@t/dependency-injection'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { WebConfigValuesSchema, registerConfigRepo } from '../../index.ts'
import { ConfigRepositoryImpl } from '../../infrastructure/ConfigRepositoryImpl.ts'

const unsetEnv = (key: string) => delete process.env[key]

const REQUIRED_ENV: Record<string, string> = {
  ENVIRONMENT: 'testing',
  AI_SERVICE_URL: 'http://ai.test',
  METRICS_AUTH_TOKEN: 'token',
  SYSTEM_API_KEY: 'key',
  CRON_SECRET: 'test-cron-secret',
  POSTHOG_API_KEY: 'phc_test',
  STRIPE_KEY: 'sk_test_xxx',
  STRIPE_REDIRECT_DOMAIN: 'https://example.com',
  STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
  APPLE_PRODUCTION_URL: 'https://buy.itunes.apple.com',
  APPLE_SANDBOX_URL: 'https://sandbox.itunes.apple.com',
  APPLE_APP_SHARED_SECRET: 'apple_secret',
  APP_STORE_BUNDLE_ID: 'com.example.app',
  APP_STORE_ENVIRONMENT: 'Production',
  ANDROID_PUBLISHER_URL: 'https://androidpublisher.googleapis.com',
  CORE_REVENUE_CAT_API_KEY: 'rc_key',
  CORE_REVENUE_CAT_PROJECT_ID: 'rc_project',
  CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID: 'ent_id',
  REVENUECAT_WEBHOOK_AUTH_HEADER: 'rc_webhook_secret',
}

const WEB_ONLY_ENV: Record<string, string> = {
  ENVIRONMENT: 'testing',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xxx',
  CLERK_SECRET_KEY: 'sk_test_xxx',
}

let savedEnv: Record<string, string | undefined> = {}

const ALL_KEYS = [...Object.keys(REQUIRED_ENV), ...Object.keys(WEB_ONLY_ENV)]

beforeEach(() => {
  savedEnv = {}
  for (const key of ALL_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  savedEnv.DATABASE_URL = process.env.DATABASE_URL
  unsetEnv('DATABASE_URL')
})

afterEach(() => {
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) unsetEnv(key)
    else process.env[key] = val
  }
})

function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v
  }
}

describe('registerConfigRepo — default (full) schema', () => {
  beforeEach(() => setEnv(REQUIRED_ENV))

  test('registers CONFIG token as a singleton ConfigRepositoryImpl', () => {
    const container = createContainer()
    registerConfigRepo(container)
    const config = container.resolve(dependencyKeys.global.CONFIG)
    expect(config).toBeInstanceOf(ConfigRepositoryImpl)
  })

  test('CONFIG is singleton — same instance on repeated resolves', () => {
    const container = createContainer()
    registerConfigRepo(container)
    expect(container.resolve(dependencyKeys.global.CONFIG)).toBe(
      container.resolve(dependencyKeys.global.CONFIG),
    )
  })
})

describe('registerConfigRepo — WebConfigValuesSchema', () => {
  beforeEach(() => setEnv(WEB_ONLY_ENV))

  test('boots with only web env vars — no API fields required', () => {
    const container = createContainer()
    expect(() => registerConfigRepo(container, { schema: WebConfigValuesSchema })).not.toThrow()
  })

  test('registered value is a ConfigRepositoryImpl', () => {
    const container = createContainer()
    registerConfigRepo(container, { schema: WebConfigValuesSchema })
    expect(container.resolve(dependencyKeys.global.CONFIG)).toBeInstanceOf(ConfigRepositoryImpl)
  })

  test('throws when ENVIRONMENT is invalid', () => {
    process.env.ENVIRONMENT = 'bad_env'
    const container = createContainer()
    expect(() => registerConfigRepo(container, { schema: WebConfigValuesSchema })).toThrow()
  })
})
