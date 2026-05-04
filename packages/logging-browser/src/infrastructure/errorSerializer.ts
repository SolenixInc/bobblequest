/**
 * @fileoverview Error serializer that flattens Error instances for structured logging.
 */

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
  if (Array.isArray(value)) {
    let changed = false
    const result = value.map((item) => {
      const walked = walk(item)
      if (walked !== item) changed = true
      return walked
    })
    return changed ? result : value
  }
  if (typeof value !== 'object') return value

  const source = value as Record<string | symbol, unknown>
  let changed = false
  const out: Record<string | symbol, unknown> = {}
  for (const [k, v] of Object.entries(source)) {
    const walked = walk(v)
    if (walked !== v) changed = true
    out[k] = walked
  }
  for (const sym of Object.getOwnPropertySymbols(source)) {
    out[sym] = source[sym]
  }
  return changed ? out : value
}

/**
 * Returns a format function that flattens any Error instance anywhere in the
 * info tree into a plain `{ type, message, stack }` object so JSON.stringify
 * captures the full payload.
 */
export function errorSerializerFormat(): (info: unknown) => unknown {
  return (info: unknown) => walk(info)
}
