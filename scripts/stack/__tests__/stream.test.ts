/**
 * Unit tests for scripts/stack/stream.ts
 *
 * Covers:
 *   1. Prefixes each line with [<label>]
 *   2. Multi-line input produces multiple prefixed lines
 *   3. null/undefined source resolves immediately (no-op)
 *   4. color option wraps label in ANSI escape codes
 *   5. Custom output stream receives the prefixed output
 *   6. Handles a Web ReadableStream<Uint8Array> source
 */

import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { pipeWithPrefix } from '../stream.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a Node Readable that emits `text` then ends. */
function nodeReadableFrom(text: string): Readable {
  return Readable.from([text])
}

/** Builds a Web ReadableStream<Uint8Array> that emits `text` then closes. */
function webReadableFrom(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

/** Returns a minimal WritableStream mock that captures written strings. */
function makeWritableMock() {
  const chunks: string[] = []
  const mock = {
    write: vi.fn((chunk: unknown) => {
      chunks.push(String(chunk))
      return true
    }),
    chunks,
  }
  return mock
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pipeWithPrefix', () => {
  it('prefixes a single line with [<label>]', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(nodeReadableFrom('hello world'), {
      label: 'mobile',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    expect(written).toContain('[mobile]')
    expect(written).toContain('hello world')
  })

  it('multi-line input produces one prefixed line per source line', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(nodeReadableFrom('line one\nline two\nline three'), {
      label: 'desktop',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    const lines = written.split('\n').filter(Boolean)
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line).toMatch(/^\[desktop\]/)
    }
    expect(lines[0]).toContain('line one')
    expect(lines[1]).toContain('line two')
    expect(lines[2]).toContain('line three')
  })

  it('returns a resolved Promise immediately when source is null', async () => {
    const out = makeWritableMock()
    await expect(
      pipeWithPrefix(null, { label: 'api', stream: out as unknown as NodeJS.WritableStream }),
    ).resolves.toBeUndefined()
    expect(out.write).not.toHaveBeenCalled()
  })

  it('returns a resolved Promise immediately when source is undefined', async () => {
    const out = makeWritableMock()
    await expect(
      pipeWithPrefix(undefined, {
        label: 'api',
        stream: out as unknown as NodeJS.WritableStream,
      }),
    ).resolves.toBeUndefined()
    expect(out.write).not.toHaveBeenCalled()
  })

  it('wraps label in ANSI codes when color is provided', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(nodeReadableFrom('data'), {
      label: 'mobile',
      color: 'cyan',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    // Cyan ANSI code must appear before the bracket+label
    expect(written).toContain('\x1b[36m[mobile]\x1b[0m')
    // Line content follows uncolored
    expect(written).toContain('data')
  })

  it('does not emit any ANSI codes when color is omitted', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(nodeReadableFrom('data'), {
      label: 'desktop',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    expect(written).not.toContain('\x1b[')
    expect(written).toContain('[desktop] data')
  })

  it('writes to process.stdout when no stream option is provided', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await pipeWithPrefix(nodeReadableFrom('stdout line'), { label: 'web' })
      const allWritten = writeSpy.mock.calls.map((c) => String(c[0])).join('')
      expect(allWritten).toContain('[web]')
      expect(allWritten).toContain('stdout line')
    } finally {
      writeSpy.mockRestore()
    }
  })

  it('custom output stream receives the fully-prefixed output', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(nodeReadableFrom('custom output'), {
      label: 'api',
      color: 'green',
      stream: out as unknown as NodeJS.WritableStream,
    })

    expect(out.write).toHaveBeenCalled()
    const written = out.chunks.join('')
    // Full prefix format: ANSI_GREEN[api]RESET<space>custom output\n
    expect(written).toBe('\x1b[32m[api]\x1b[0m custom output\n')
  })

  it('handles a Web ReadableStream<Uint8Array> source', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(webReadableFrom('web stream line'), {
      label: 'mobile',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    expect(written).toContain('[mobile]')
    expect(written).toContain('web stream line')
  })

  it('handles a multi-line Web ReadableStream<Uint8Array> source', async () => {
    const out = makeWritableMock()
    await pipeWithPrefix(webReadableFrom('alpha\nbeta\ngamma'), {
      label: 'desktop',
      color: 'magenta',
      stream: out as unknown as NodeJS.WritableStream,
    })

    const written = out.chunks.join('')
    const lines = written.split('\n').filter(Boolean)
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are intentional in stream output tests
      expect(line).toMatch(/^\[35m\[desktop\]\[0m /)
    }
  })
})
