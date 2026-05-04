/**
 * @fileoverview Singleton factory for the PostHog OTLP winston transport.
 *
 * Kept as a singleton because the underlying OpenTelemetry LoggerProvider
 * owns a batching interval — constructing it once per logger would leak
 * timers and saturate PostHog with overlapping batch processors.
 */

import process from 'node:process'
import type winston from 'winston'
import type { OTLPConfig } from '../../entities/types/otlpConfig.ts'
import { OTLPWinstonTransport } from './otlpTransport.ts'

let cached: winston.transport | null = null
let initialized = false

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildConfig(apiKey: string): OTLPConfig {
  const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com'
  const endpoint = process.env.POSTHOG_OTLP_ENDPOINT ?? `${host.replace(/\/+$/, '')}/v1/logs`
  return {
    endpoint,
    apiKey,
    maxQueueSize: envInt('POSTHOG_OTLP_MAX_QUEUE_SIZE', 2048),
    batchSize: envInt('POSTHOG_OTLP_BATCH_SIZE', 512),
    exportIntervalMillis: envInt('POSTHOG_OTLP_EXPORT_INTERVAL_MS', 5000),
    exportTimeoutMillis: envInt('POSTHOG_OTLP_EXPORT_TIMEOUT_MS', 30_000),
  }
}

export function getOrCreateOTLPTransport(): winston.transport | null {
  if (initialized) return cached
  initialized = true

  const apiKey = process.env.POSTHOG_API_KEY
  if (!apiKey) {
    cached = null
    return null
  }

  cached = new OTLPWinstonTransport(buildConfig(apiKey))
  return cached
}

export async function shutdownOTLPTransport(): Promise<void> {
  const transport = cached
  cached = null
  initialized = false
  if (transport === null) return
  if (typeof (transport as unknown as { shutdown?: () => Promise<void> }).shutdown === 'function') {
    try {
      await (transport as unknown as { shutdown: () => Promise<void> }).shutdown()
    } catch {
      // Swallow shutdown errors — mirrors OTLPWinstonTransport's own contract.
    }
  }
}

export function resetOTLPTransportForTests(): void {
  cached = null
  initialized = false
}
