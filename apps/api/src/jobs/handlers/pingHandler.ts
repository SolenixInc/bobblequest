import type { Logger } from '@t/logging'

export interface PingPayload {
  message: string
}

export function pingHandler(logger: Logger) {
  return async (payload: PingPayload): Promise<void> => {
    logger.info({
      message: 'Worker received ping job',
      metadata: { payload },
    })
  }
}
