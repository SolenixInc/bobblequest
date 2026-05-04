import { describe, expect, it } from 'vitest'
import { BadRequestError } from '../../infrastructure/4xx/BadRequestError.ts'
import { ConflictError } from '../../infrastructure/4xx/ConflictError.ts'
import { ForbiddenError } from '../../infrastructure/4xx/ForbiddenError.ts'
import { GoneError } from '../../infrastructure/4xx/GoneError.ts'
import { MethodNotFoundError } from '../../infrastructure/4xx/MethodNotFoundError.ts'
import { NotFoundError } from '../../infrastructure/4xx/NotFoundError.ts'
import { PreconditionFailedError } from '../../infrastructure/4xx/PreconditionFailedError.ts'
import { RequestTimeoutError } from '../../infrastructure/4xx/RequestTimeoutError.ts'
import { TooManyRequestsError } from '../../infrastructure/4xx/TooManyRequestsError.ts'
import { UnauthorizedError } from '../../infrastructure/4xx/UnauthorizedError.ts'
import { UnprocessableEntityError } from '../../infrastructure/4xx/UnprocessableEntityError.ts'
import { UnsupportedMediaTypeError } from '../../infrastructure/4xx/UnsupportedMediaTypeError.ts'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'

describe('4xx error — getters coverage', () => {
  it('BadRequestError.details and name', () => {
    const e = new BadRequestError('dev', 'user')
    expect(e.name).toBe('Bad Request')
    expect(typeof e.details).toBe('string')
    expect(e.details.length).toBeGreaterThan(0)
  })

  it('ConflictError.name and details', () => {
    const e = new ConflictError('dev', 'user')
    expect(e.name).toBe('Conflict')
    expect(typeof e.details).toBe('string')
  })

  it('ForbiddenError.name and details', () => {
    const e = new ForbiddenError('dev', 'user')
    expect(e.name).toBe('Forbidden')
    expect(typeof e.details).toBe('string')
  })

  it('GoneError — status 410, name, details', () => {
    const e = new GoneError('dev', 'user')
    expect(e.status).toBe(410)
    expect(e.name).toBe('Gone')
    expect(typeof e.details).toBe('string')
  })

  it('GoneError — with cause', () => {
    const cause = new Error('gone')
    const e = new GoneError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('MethodNotFoundError — status 405, name, details', () => {
    const e = new MethodNotFoundError('dev', 'user')
    expect(e.status).toBe(405)
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('MethodNotFoundError — with cause', () => {
    const cause = new Error('method')
    const e = new MethodNotFoundError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('NotFoundError.details', () => {
    const e = new NotFoundError('dev', 'user')
    expect(typeof e.details).toBe('string')
  })

  it('PreconditionFailedError — status 412, name, details', () => {
    const e = new PreconditionFailedError('dev', 'user')
    expect(e.status).toBe(412)
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('PreconditionFailedError — with cause', () => {
    const cause = new Error('precond')
    const e = new PreconditionFailedError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('RequestTimeoutError — status 408, name, details', () => {
    const e = new RequestTimeoutError('dev', 'user')
    expect(e.status).toBe(408)
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('RequestTimeoutError — with cause', () => {
    const cause = new Error('timeout')
    const e = new RequestTimeoutError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('TooManyRequestsError.name and details', () => {
    const e = new TooManyRequestsError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('TooManyRequestsError — with cause', () => {
    const cause = new Error('rate')
    const e = new TooManyRequestsError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('UnauthorizedError.name and details', () => {
    const e = new UnauthorizedError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('UnprocessableEntityError.name and details', () => {
    const e = new UnprocessableEntityError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('UnprocessableEntityError — with cause', () => {
    const cause = new Error('entity')
    const e = new UnprocessableEntityError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('UnsupportedMediaTypeError — status 415, name, details', () => {
    const e = new UnsupportedMediaTypeError('dev', 'user')
    expect(e.status).toBe(415)
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('UnsupportedMediaTypeError — with cause', () => {
    const cause = new Error('media')
    const e = new UnsupportedMediaTypeError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('ValidationError.details', () => {
    const e = new ValidationError('dev', 'user')
    expect(typeof e.details).toBe('string')
  })
})
