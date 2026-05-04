import { describe, expect, test } from 'vitest'
import { AndroidConfigSchema } from '../AndroidConfigSchema.ts'
import { AppStoreConfigSchema } from '../AppStoreConfigSchema.ts'
import { AppleConfigSchema } from '../AppleConfigSchema.ts'
import { DbConfigSchema, resolveDbConfig } from '../DbConfigSchema.ts'
import { LoggingConfigSchema } from '../LoggingConfigSchema.ts'
import { PostHogConfigSchema } from '../PostHogConfigSchema.ts'
import { RevenueCatConfigSchema } from '../RevenueCatConfigSchema.ts'
import { StripeConfigSchema } from '../StripeConfigSchema.ts'
import { SystemConfigSchema } from '../SystemConfigSchema.ts'

describe('StripeConfigSchema', () => {
  test('accepts required fields', () => {
    const result = StripeConfigSchema.parse({
      apiKey: 'sk_test_xxx',
      redirectDomain: 'https://example.com',
      webhookSecret: 'whsec_xxx',
    })
    expect(result.apiKey).toBe('sk_test_xxx')
    expect(result.redirectDomain).toBe('https://example.com')
    expect(result.webhookSecret).toBe('whsec_xxx')
  })

  test('rejects missing apiKey', () => {
    expect(StripeConfigSchema.safeParse({ redirectDomain: 'x', webhookSecret: 'y' }).success).toBe(
      false,
    )
  })
})

describe('RevenueCatConfigSchema', () => {
  test('accepts required fields', () => {
    const result = RevenueCatConfigSchema.parse({
      apiKey: 'rc_key',
      projectId: 'proj_id',
      nutraforgeEntitlementId: 'ent_id',
      webhookAuthHeader: 'Bearer super-secret',
    })
    expect(result.apiKey).toBe('rc_key')
    expect(result.projectId).toBe('proj_id')
    expect(result.nutraforgeEntitlementId).toBe('ent_id')
    expect(result.webhookAuthHeader).toBe('Bearer super-secret')
  })

  test('rejects missing webhookAuthHeader', () => {
    expect(
      RevenueCatConfigSchema.safeParse({
        apiKey: 'rc_key',
        projectId: 'proj_id',
        nutraforgeEntitlementId: 'ent_id',
      }).success,
    ).toBe(false)
  })

  test('rejects empty webhookAuthHeader', () => {
    expect(
      RevenueCatConfigSchema.safeParse({
        apiKey: 'rc_key',
        projectId: 'proj_id',
        nutraforgeEntitlementId: 'ent_id',
        webhookAuthHeader: '',
      }).success,
    ).toBe(false)
  })

  test('rejects missing fields', () => {
    expect(RevenueCatConfigSchema.safeParse({}).success).toBe(false)
  })
})

describe('AppleConfigSchema', () => {
  test('accepts required fields', () => {
    const result = AppleConfigSchema.parse({
      prodUrl: 'https://buy.itunes.apple.com',
      sandboxUrl: 'https://sandbox.itunes.apple.com',
      sharedSecret: 'secret123',
    })
    expect(result.prodUrl).toBe('https://buy.itunes.apple.com')
  })

  test('rejects missing sharedSecret', () => {
    expect(AppleConfigSchema.safeParse({ prodUrl: 'x', sandboxUrl: 'y' }).success).toBe(false)
  })
})

describe('AppStoreConfigSchema', () => {
  test('accepts required fields', () => {
    const result = AppStoreConfigSchema.parse({
      bundleId: 'com.example.app',
      environment: 'Production',
    })
    expect(result.bundleId).toBe('com.example.app')
    expect(result.environment).toBe('Production')
  })
})

describe('AndroidConfigSchema', () => {
  test('accepts publisherUrl', () => {
    const result = AndroidConfigSchema.parse({
      publisherUrl: 'https://androidpublisher.googleapis.com',
    })
    expect(result.publisherUrl).toBe('https://androidpublisher.googleapis.com')
  })

  test('rejects missing publisherUrl', () => {
    expect(AndroidConfigSchema.safeParse({}).success).toBe(false)
  })
})

describe('LoggingConfigSchema', () => {
  test('applies defaults', () => {
    const result = LoggingConfigSchema.parse({})
    expect(result.level).toBe('info')
    expect(result.serviceName).toBe('app')
    expect(result.destination).toBe('stdout')
    expect(result.environment).toBe('development')
  })

  test('accepts all log levels', () => {
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const) {
      expect(LoggingConfigSchema.parse({ level }).level).toBe(level)
    }
  })

  test('accepts redactExtraPaths array', () => {
    const result = LoggingConfigSchema.parse({ redactExtraPaths: ['ssn', 'dob'] })
    expect(result.redactExtraPaths).toEqual(['ssn', 'dob'])
  })

  test('rejects invalid destination', () => {
    expect(LoggingConfigSchema.safeParse({ destination: 'file' }).success).toBe(false)
  })
})

describe('PostHogConfigSchema', () => {
  test('accepts apiKey', () => {
    expect(PostHogConfigSchema.parse({ apiKey: 'phc_xxx' }).apiKey).toBe('phc_xxx')
  })

  test('rejects missing apiKey', () => {
    expect(PostHogConfigSchema.safeParse({}).success).toBe(false)
  })

  test('rejects empty-string apiKey', () => {
    expect(PostHogConfigSchema.safeParse({ apiKey: '' }).success).toBe(false)
  })
})

describe('SystemConfigSchema', () => {
  const base = {
    isLocal: true,
    aiServiceUrl: 'http://localhost:8080',
    metricsAuthToken: 'token',
    systemApiKey: 'key',
    cronSecret: 'secret',
  }

  test('accepts required fields with defaults', () => {
    const result = SystemConfigSchema.parse(base)
    expect(result.environment).toBe('development')
    expect(result.logLevel).toBe('debug')
    expect(result.port).toBe(8000)
    expect(result.isLocal).toBe(true)
  })

  test('accepts all valid logLevel values', () => {
    for (const level of ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] as const) {
      expect(SystemConfigSchema.parse({ ...base, logLevel: level }).logLevel).toBe(level)
    }
  })

  test('accepts port override', () => {
    expect(SystemConfigSchema.parse({ ...base, isLocal: false, port: 3000 }).port).toBe(3000)
  })

  test('accepts all valid environment values', () => {
    for (const env of ['development', 'local', 'testing', 'production'] as const) {
      expect(SystemConfigSchema.parse({ ...base, environment: env }).environment).toBe(env)
    }
  })

  test('rejects "staging" environment value', () => {
    expect(SystemConfigSchema.safeParse({ ...base, environment: 'staging' }).success).toBe(false)
  })

  test('rejects invalid environment value', () => {
    expect(SystemConfigSchema.safeParse({ ...base, environment: 'invalid_env' }).success).toBe(
      false,
    )
  })

  test('rejects invalid logLevel value', () => {
    expect(SystemConfigSchema.safeParse({ ...base, logLevel: 'invalid' }).success).toBe(false)
  })
})

describe('DbConfigSchema', () => {
  test('accepts required url with defaults', () => {
    const result = DbConfigSchema.parse({ url: 'postgres://localhost/db' })
    expect(result.url).toBe('postgres://localhost/db')
    expect(result.maxConnections).toBe(10)
    expect(result.prepare).toBe(false)
  })

  test('accepts explicit maxConnections and prepare', () => {
    const result = DbConfigSchema.parse({
      url: 'postgres://localhost/db',
      maxConnections: 20,
      prepare: true,
    })
    expect(result.maxConnections).toBe(20)
    expect(result.prepare).toBe(true)
  })

  test('rejects empty url', () => {
    expect(DbConfigSchema.safeParse({ url: '' }).success).toBe(false)
  })
})

describe('resolveDbConfig', () => {
  test('maps DATABASE_URL', () => {
    const cfg = resolveDbConfig({ DATABASE_URL: 'postgres://localhost/db' })
    expect(cfg.url).toBe('postgres://localhost/db')
    expect(cfg.prepare).toBe(false)
    expect(cfg.maxConnections).toBe(10)
  })

  test('DATABASE_PREPARE="true" -> prepare: true', () => {
    expect(
      resolveDbConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_PREPARE: 'true' })
        .prepare,
    ).toBe(true)
  })

  test('DATABASE_PREPARE="1" -> prepare: true', () => {
    expect(
      resolveDbConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_PREPARE: '1' }).prepare,
    ).toBe(true)
  })

  test('DATABASE_PREPARE="yes" -> prepare: true', () => {
    expect(
      resolveDbConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_PREPARE: 'yes' }).prepare,
    ).toBe(true)
  })

  test('DATABASE_PREPARE="false" -> prepare: false', () => {
    expect(
      resolveDbConfig({ DATABASE_URL: 'postgres://localhost/db', DATABASE_PREPARE: 'false' })
        .prepare,
    ).toBe(false)
  })

  test('DATABASE_MAX_CONNECTIONS is parsed as integer', () => {
    const cfg = resolveDbConfig({
      DATABASE_URL: 'postgres://localhost/db',
      DATABASE_MAX_CONNECTIONS: '25',
    })
    expect(cfg.maxConnections).toBe(25)
  })
})
