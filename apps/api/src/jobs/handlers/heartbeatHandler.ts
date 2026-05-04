import type { Logger } from '@t/logging'

export function heartbeatHandler(logger: Logger) {
  return async (_payload: unknown): Promise<void> => {
    logger.info({ message: 'heartbeat tick' })
  }
}
