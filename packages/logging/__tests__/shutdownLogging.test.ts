/**
 * @fileoverview Tests for shutdownLogging() public lifecycle helper and
 * shutdownOTLPTransport() factory internals.
 */

import process from 'node:process'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { OTLPWinstonTransport } from '../infrastructure/transports/otlpTransport.ts'
import {
  getOrCreateOTLPTransport,
  resetOTLPTransportForTests,
} from '../infrastructure/transports/transportFactory.ts'
import { shutdownLogging } from '../lifecycle/shutdownLogging.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setApiKey(key: string | undefined): () => void {
  const prev = process.env.POSTHOG_API_KEY
  if (key === undefined) {
    Reflect.deleteProperty(process.env, 'POSTHOG_API_KEY')
  } else {
    process.env.POSTHOG_API_KEY = key
  }
  return () => {
    if (prev === undefined) Reflect.deleteProperty(process.env, 'POSTHOG_API_KEY')
    else process.env.POSTHOG_API_KEY = prev
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shutdownLogging()', () => {
  beforeEach(() => {
    resetOTLPTransportForTests()
  })

  afterEach(() => {
    resetOTLPTransportForTests()
    vi.restoreAllMocks()
  })

  test('transport exists → shutdown awaited and called once', async () => {
    const restoreKey = setApiKey('test-api-key')
    try {
      // Stub shutdown on the prototype so we don't make real network calls.
      const shutdownSpy = vi
        .spyOn(OTLPWinstonTransport.prototype, 'shutdown')
        .mockResolvedValue(undefined)

      // Seed the singleton cache.
      const transport = getOrCreateOTLPTransport()
      expect(transport).not.toBeNull()

      await shutdownLogging()

      expect(shutdownSpy).toHaveBeenCalledTimes(1)
    } finally {
      restoreKey()
    }
  })

  test('no-op when transport is null (testing env without API key)', async () => {
    const restoreKey = setApiKey(undefined)
    try {
      const shutdownSpy = vi.spyOn(OTLPWinstonTransport.prototype, 'shutdown')

      // Cache is null because no API key.
      const transport = getOrCreateOTLPTransport()
      expect(transport).toBeNull()

      await expect(shutdownLogging()).resolves.toBeUndefined()
      expect(shutdownSpy).not.toHaveBeenCalled()
    } finally {
      restoreKey()
    }
  })

  test('idempotent: second call is a no-op (cache reset after first shutdown)', async () => {
    const restoreKey = setApiKey('test-api-key')
    try {
      const shutdownSpy = vi
        .spyOn(OTLPWinstonTransport.prototype, 'shutdown')
        .mockResolvedValue(undefined)

      getOrCreateOTLPTransport()

      await shutdownLogging()
      // Cache is now null; re-seeding requires re-init.
      // Second call: transport is null → no-op.
      await shutdownLogging()

      expect(shutdownSpy).toHaveBeenCalledTimes(1)
    } finally {
      restoreKey()
    }
  })

  test('swallows errors thrown by transport.shutdown()', async () => {
    const restoreKey = setApiKey('test-api-key')
    try {
      vi.spyOn(OTLPWinstonTransport.prototype, 'shutdown').mockRejectedValue(
        new Error('flush timeout'),
      )

      getOrCreateOTLPTransport()

      await expect(shutdownLogging()).resolves.toBeUndefined()
    } finally {
      restoreKey()
    }
  })
})
