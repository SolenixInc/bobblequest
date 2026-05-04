import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../entities/ports/AppError.ts'

// Concrete subclass for testing the abstract base
class TestError extends AppError {
  get name(): string {
    return 'Test Error'
  }
  get status(): ContentfulStatusCode {
    return 400
  }
  get details(): string {
    return 'A test error.'
  }
}

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = new TestError('something failed', 'User-facing message')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it('sets message correctly', () => {
    const err = new TestError('dev message', 'user message')
    expect(err.message).toBe('dev message')
  })

  it('sets responseMessage correctly', () => {
    const err = new TestError('dev message', 'user message')
    expect(err.responseMessage).toBe('user message')
  })

  it('exposes name, status, details from subclass', () => {
    const err = new TestError('msg', 'resp')
    expect(err.name).toBe('Test Error')
    expect(err.status).toBe(400)
    expect(err.details).toBe('A test error.')
  })

  it('stores cause from options', () => {
    const cause = new Error('root cause')
    const err = new TestError('msg', 'resp', { cause })
    expect(err.cause).toBe(cause)
  })

  it('stores fileName from options', () => {
    const err = new TestError('msg', 'resp', { fileName: 'service.ts' })
    expect(err.fileName).toBe('service.ts')
  })

  it('stores metadata from options', () => {
    const metadata = { userId: '123', requestId: 'abc' }
    const err = new TestError('msg', 'resp', { metadata })
    expect(err.metadata).toEqual(metadata)
  })

  it('has a stack trace', () => {
    const err = new TestError('msg', 'resp')
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe('string')
  })

  it('works without optional arguments', () => {
    const err = new TestError('msg', 'resp')
    expect(err.cause).toBeUndefined()
    expect(err.fileName).toBeUndefined()
    expect(err.metadata).toBeUndefined()
  })
})
