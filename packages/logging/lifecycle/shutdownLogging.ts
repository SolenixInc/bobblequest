/**
 * @fileoverview Public lifecycle helper — await OTLP transport flush before
 * process exit (SIGTERM / SIGINT handlers, graceful shutdown sequences).
 *
 * The real shutdown logic lives in transportFactory so the singleton cache
 * stays in one place; this module is the public-API seam.
 */

import { shutdownOTLPTransport } from '../infrastructure/transports/transportFactory.ts'

export async function shutdownLogging(): Promise<void> {
  await shutdownOTLPTransport()
}
