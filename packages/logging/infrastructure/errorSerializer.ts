import winston from 'winston'

interface SerializedError {
  type: string
  message: string
  stack: string
}

function serializeError(err: Error): SerializedError {
  return {
    type: err.name,
    message: err.message,
    stack: err.stack ?? '',
  }
}

function walk(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Error) return serializeError(value)
  if (Array.isArray(value)) return value.map(walk)
  if (typeof value !== 'object') return value

  const source = value as Record<string | symbol, unknown>
  const out: Record<string | symbol, unknown> = {}
  for (const [k, v] of Object.entries(source)) {
    out[k] = walk(v)
  }
  for (const sym of Object.getOwnPropertySymbols(source)) {
    out[sym] = source[sym]
  }
  return out
}

/**
 * Winston format that flattens any Error instance anywhere in the info tree
 * into a plain `{ type, message, stack }` object so JSON.stringify captures
 * the full payload. Winston's built-in `format.errors({ stack: true })` only
 * handles the top-level `info.message` case; this covers nested Errors like
 * `logger.error({ metadata: { err: new Error(...) } })`.
 */
export const errorSerializerFormat = winston.format(
  (info) => walk(info) as winston.Logform.TransformableInfo,
)
