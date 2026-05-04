import { createRequestLogger } from '@t/logging'
import { describe, expect, it, vi } from 'vitest'
import { logErrorAtAppropriateLevel } from '../../delivery/utils/logErrorAtAppropriateLevel.ts'

describe('logErrorAtAppropriateLevel', () => {
  const payload = { message: 'test error', metadata: { code: 42 } }
  const fileName = 'test.ts'

  it('calls logger.warning for 401 status (RequestLogger branch)', () => {
    const logger = createRequestLogger({ requestId: 'req-1' })
    const spy = vi.spyOn(logger, 'warning').mockImplementation(() => {})
    logErrorAtAppropriateLevel(logger, 401, payload, fileName)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('calls logger.info for 400 status (RequestLogger info branch)', () => {
    const logger = createRequestLogger({ requestId: 'req-2' })
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {})
    logErrorAtAppropriateLevel(logger, 400, payload, fileName)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('calls logger.error for 500 status (RequestLogger error branch)', () => {
    const logger = createRequestLogger({ requestId: 'req-3' })
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    logErrorAtAppropriateLevel(logger, 500, payload, fileName)
    expect(spy).toHaveBeenCalledOnce()
  })
})
