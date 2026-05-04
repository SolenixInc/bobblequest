import { describe, expect, test } from 'vitest'
import { RedisConfigSchema, resolveRedisConfig } from '../RedisConfigSchema.ts'

describe('RedisConfigSchema', () => {
  test('applies defaults when given empty object', () => {
    const cfg = RedisConfigSchema.parse({})
    expect(cfg.host).toBe('localhost')
    expect(cfg.port).toBe(6379)
    expect(cfg.tls).toBe(false)
    expect(cfg.db).toBe(0)
    expect(cfg.url).toBeUndefined()
    expect(cfg.password).toBeUndefined()
  })

  test('accepts url override', () => {
    const cfg = RedisConfigSchema.parse({ url: 'redis://user:pass@host:6379/0' })
    expect(cfg.url).toBe('redis://user:pass@host:6379/0')
  })

  test('rejects negative port', () => {
    expect(RedisConfigSchema.safeParse({ port: -1 }).success).toBe(false)
  })
})

describe('resolveRedisConfig', () => {
  test('maps REDIS_URL', () => {
    const cfg = resolveRedisConfig({ REDIS_URL: 'redis://localhost:6379' })
    expect(cfg.url).toBe('redis://localhost:6379')
  })

  test('maps REDIS_HOST and REDIS_PORT', () => {
    const cfg = resolveRedisConfig({ REDIS_HOST: 'myhost', REDIS_PORT: '6380' })
    expect(cfg.host).toBe('myhost')
    expect(cfg.port).toBe(6380)
  })

  test('maps REDIS_TLS="true" -> true', () => {
    expect(resolveRedisConfig({ REDIS_TLS: 'true' }).tls).toBe(true)
  })

  test('maps REDIS_TLS="1" -> true', () => {
    expect(resolveRedisConfig({ REDIS_TLS: '1' }).tls).toBe(true)
  })

  test('maps REDIS_TLS="yes" -> true', () => {
    expect(resolveRedisConfig({ REDIS_TLS: 'yes' }).tls).toBe(true)
  })

  test('maps REDIS_TLS="false" -> false', () => {
    expect(resolveRedisConfig({ REDIS_TLS: 'false' }).tls).toBe(false)
  })

  test('maps REDIS_DB', () => {
    expect(resolveRedisConfig({ REDIS_DB: '3' }).db).toBe(3)
  })

  test('maps REDIS_PASSWORD', () => {
    expect(resolveRedisConfig({ REDIS_PASSWORD: 'secret' }).password).toBe('secret')
  })

  test('applies defaults when env is empty', () => {
    const cfg = resolveRedisConfig({})
    expect(cfg.host).toBe('localhost')
    expect(cfg.port).toBe(6379)
    expect(cfg.tls).toBe(false)
    expect(cfg.db).toBe(0)
  })
})
