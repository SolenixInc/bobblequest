import { z } from 'zod'

/**
 * Cache key convention: `<env>:<module>:<id>`.
 *
 * Each segment:
 *   - MUST be non-empty
 *   - MUST NOT contain `:` (reserved as the segment separator)
 *   - MUST NOT contain whitespace (trips up Redis CLI tooling and human
 *     log parsing)
 *
 * We intentionally forbid only the structural separators rather than
 * restricting to alphanumerics, so callers can use URL-safe ids, UUIDs,
 * ULIDs, or slugs without an extra encoding pass.
 */
const SEGMENT = /^[^\s:]+$/

export const CacheKeySchema = z
  .string()
  .min(1)
  .regex(
    /^[^\s:]+:[^\s:]+:[^\s:]+$/,
    'cache key must match <env>:<module>:<id> (no spaces, no extra colons)',
  )

export type CacheKey = z.infer<typeof CacheKeySchema>

export interface BuildCacheKeyArgs {
  readonly env: string
  readonly module: string
  readonly id: string
}

/**
 * Compose and validate a cache key from its three segments.
 *
 * Throws a `z.ZodError` if any segment is empty or contains a reserved
 * character. The composed string is validated against {@link CacheKeySchema}
 * so the caller gets a uniform error surface regardless of which segment
 * was bad.
 */
export function buildCacheKey(args: BuildCacheKeyArgs): CacheKey {
  const { env, module, id } = args

  for (const [name, value] of [
    ['env', env],
    ['module', module],
    ['id', id],
  ] as const) {
    if (!SEGMENT.test(value)) {
      throw new Error(
        `invalid cache key segment '${name}'='${value}' — must be non-empty and contain no whitespace or ':'`,
      )
    }
  }

  const key = `${env}:${module}:${id}`
  return CacheKeySchema.parse(key)
}
