/**
 * stream.ts — line-buffered prefix helper for host-app subprocess streams.
 *
 * Pipes a ReadableStream<Uint8Array> or Node Readable through readline,
 * prepending `[<label>] ` to every line and writing to the target stream.
 *
 * Usage:
 *   await pipeWithPrefix(proc.stdout, { label: 'mobile', color: 'cyan' })
 */

import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnsiColor = 'cyan' | 'magenta' | 'yellow' | 'green' | 'blue' | 'red' | 'gray'

export type PipePrefixOptions = {
  /** e.g. 'mobile', 'desktop' */
  label: string
  /** If provided, wraps the bracket+label in the matching ANSI color. */
  color?: AnsiColor
  /** Defaults to process.stdout. */
  stream?: NodeJS.WritableStream
}

// ---------------------------------------------------------------------------
// Tiny inline ANSI map — no chalk dependency
// ---------------------------------------------------------------------------

const ANSI: Record<AnsiColor, string> = {
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}
const RESET = '\x1b[0m'

// ---------------------------------------------------------------------------
// Runtime detection helpers
// ---------------------------------------------------------------------------

/** Returns true when `value` looks like a Web ReadableStream<Uint8Array>. */
function isWebReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as ReadableStream).getReader === 'function' &&
    !(value instanceof Readable)
  )
}

/**
 * Converts a Web ReadableStream<Uint8Array> into a Node.js Readable so that
 * readline.createInterface can consume it uniformly.
 */
function webStreamToNodeReadable(webStream: ReadableStream<Uint8Array>): Readable {
  const reader = webStream.getReader()
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(Buffer.from(value))
        }
      } catch (err) {
        this.destroy(err instanceof Error ? err : new Error(String(err)))
      }
    },
    destroy(err, cb) {
      reader.cancel().then(() => cb(err), cb)
    },
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pipes a subprocess stream (stdout or stderr) through line-buffered prefixing.
 * Returns a Promise that resolves when the source stream ends.
 *
 * - Accepts either a Node Readable or a Web ReadableStream<Uint8Array>.
 * - If `source` is null/undefined, returns a resolved Promise immediately.
 * - Uses readline with crlfDelay: Infinity to handle CRLF sequences cleanly.
 * - Each line is written as `[<label>] <line>\n` to opts.stream (default: process.stdout).
 * - ANSI color (if specified) wraps only the bracket+label, not the line content.
 */
export function pipeWithPrefix(
  source: ReadableStream<Uint8Array> | NodeJS.ReadableStream | null | undefined,
  opts: PipePrefixOptions,
): Promise<void> {
  if (source == null) {
    return Promise.resolve()
  }

  const out = opts.stream ?? process.stdout

  // Build the prefix string once per call.
  const bracketLabel = `[${opts.label}]`
  const prefix = opts.color ? `${ANSI[opts.color]}${bracketLabel}${RESET} ` : `${bracketLabel} `

  // Normalise to a Node Readable so readline can always consume it.
  const nodeReadable: NodeJS.ReadableStream = isWebReadableStream(source)
    ? webStreamToNodeReadable(source)
    : source

  const rl = createInterface({
    input: nodeReadable,
    crlfDelay: Infinity,
    terminal: false,
  })

  return new Promise<void>((resolve) => {
    rl.on('line', (line) => {
      out.write(`${prefix}${line}\n`)
    })

    rl.on('close', () => {
      resolve()
    })
  })
}
