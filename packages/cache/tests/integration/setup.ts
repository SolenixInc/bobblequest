import Redis from 'ioredis'

export const TEST_REDIS_URL = process.env.REDIS_URL ?? throwMissingRedisUrl()

function throwMissingRedisUrl(): never {
  throw new Error(
    'REDIS_URL is not set.\n' +
      'Start the Redis container first:\n\n' +
      '  docker compose -f docker-compose.cache.yml up -d\n\n' +
      'Then run:\n\n' +
      '  REDIS_URL=redis://:redispassword@localhost:6380 pnpm --filter @t/cache test:integration\n',
  )
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = new Redis(TEST_REDIS_URL, { lazyConnect: true, connectTimeout: 3000 })
  try {
    await client.connect()
    await client.ping()
    return true
  } catch {
    return false
  } finally {
    try {
      client.disconnect()
    } catch {
      // best-effort
    }
  }
}

export function makeClient(): Redis {
  return new Redis(TEST_REDIS_URL)
}

export async function flushTestKeys(client: Redis, pattern: string): Promise<void> {
  const keys = await client.keys(pattern)
  if (keys.length > 0) {
    await client.del(...keys)
  }
}
