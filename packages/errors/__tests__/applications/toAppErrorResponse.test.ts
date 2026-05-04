import { afterEach, describe, expect, it, vi } from 'vitest'
import { toAppErrorResponse } from '../../applications/toAppErrorResponse.ts'
import { toUnknownErrorResponse } from '../../applications/toUnknownErrorResponse.ts'
import { NotFoundError } from '../../infrastructure/4xx/NotFoundError.ts'
import { InternalServerError } from '../../infrastructure/5xx/InternalServerError.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toAppErrorResponse', () => {
  it('returns success: false', () => {
    const err = new NotFoundError('not found', 'Resource not found.')
    const response = toAppErrorResponse(err)
    expect(response.success).toBe(false)
  })

  it('includes name, status, message, details, responseMessage', () => {
    const err = new NotFoundError('record missing', 'That item does not exist.')
    const response = toAppErrorResponse(err)
    expect(response.name).toBe('Not Found')
    expect(response.status).toBe(404)
    expect(response.message).toBe('record missing')
    expect(response.responseMessage).toBe('That item does not exist.')
  })

  it('includes requestId when provided', () => {
    const err = new NotFoundError('not found', 'Resource not found.')
    const response = toAppErrorResponse(err, 'req-123')
    expect(response.requestId).toBe('req-123')
  })

  it('omits requestId when not provided', () => {
    const err = new NotFoundError('not found', 'Resource not found.')
    const response = toAppErrorResponse(err)
    expect(response.requestId).toBeUndefined()
  })

  it('includes stack in non-production environments', () => {
    const err = new InternalServerError('crash', 'Something went wrong.')
    const response = toAppErrorResponse(err, undefined, 'development')
    expect(response.stack).toBeDefined()
  })

  it('omits stack in production environment', () => {
    const err = new InternalServerError('crash', 'Something went wrong.')
    const response = toAppErrorResponse(err, undefined, 'production')
    expect(response.stack).toBeUndefined()
  })

  it('includes stack in testing environment', () => {
    const err = new InternalServerError('crash', 'Something went wrong.')
    const response = toAppErrorResponse(err, undefined, 'testing')
    expect(response.stack).toBeDefined()
  })

  it('includes cause when present', () => {
    const cause = new Error('root cause')
    const err = new NotFoundError('not found', 'Resource not found.', { cause })
    const response = toAppErrorResponse(err)
    expect(response.cause).toBe(cause)
  })

  it('does not include cause key when cause is undefined', () => {
    const err = new NotFoundError('not found', 'Resource not found.')
    const response = toAppErrorResponse(err)
    expect('cause' in response).toBe(false)
  })
})

describe('toUnknownErrorResponse', () => {
  it('returns success: false with status 500', () => {
    const err = new Error('surprise!')
    const response = toUnknownErrorResponse(err)
    expect(response.success).toBe(false)
    expect(response.status).toBe(500)
  })

  it('returns name "Unknown Error"', () => {
    const response = toUnknownErrorResponse(new Error('oops'))
    expect(response.name).toBe('Unknown Error')
  })

  it('sanitizes message from error', () => {
    const err = new Error('plain error message')
    const response = toUnknownErrorResponse(err)
    expect(response.message).toBe('plain error message')
  })

  it('strips HTML from error message', () => {
    const err = new Error('<html><body>Error page</body></html>')
    const response = toUnknownErrorResponse(err)
    expect(response.message).not.toContain('<html>')
    expect(response.message).not.toContain('<body>')
  })

  it('includes requestId when provided', () => {
    const response = toUnknownErrorResponse(new Error('oops'), 'req-abc')
    expect(response.requestId).toBe('req-abc')
  })

  it('includes stack in non-production', () => {
    const err = new Error('oops')
    const response = toUnknownErrorResponse(err, undefined, 'development')
    expect(response.stack).toBeDefined()
  })

  it('omits stack in production', () => {
    const err = new Error('oops')
    const response = toUnknownErrorResponse(err, undefined, 'production')
    expect(response.stack).toBeUndefined()
  })

  it('handles non-Error values', () => {
    const response = toUnknownErrorResponse('just a string', undefined, 'development')
    expect(response.message).toBe('just a string')
  })
})
