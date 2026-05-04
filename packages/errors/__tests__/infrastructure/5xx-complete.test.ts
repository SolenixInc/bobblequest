import { describe, expect, it } from 'vitest'
import { BadGatewayError } from '../../infrastructure/5xx/BadGatewayError.ts'
import { ExternalStorageTimeoutError } from '../../infrastructure/5xx/ExternalStorageTimeoutError.ts'
import { GatewayTimeoutError } from '../../infrastructure/5xx/GatewayTimeoutError.ts'
import { InsufficientStorageError } from '../../infrastructure/5xx/InsufficientStorageError.ts'
import { InternalServerError } from '../../infrastructure/5xx/InternalServerError.ts'
import { NetworkAuthenticationRequiredError } from '../../infrastructure/5xx/NetworkAuthenticationRequiredError.ts'
import { NotImplementedError } from '../../infrastructure/5xx/NotImplementedError.ts'
import { ServiceUnavailableError } from '../../infrastructure/5xx/ServiceUnavailableError.ts'

describe('5xx error — getters coverage', () => {
  it('BadGatewayError.name and details', () => {
    const e = new BadGatewayError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('BadGatewayError — with cause', () => {
    const cause = new Error('upstream')
    const e = new BadGatewayError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('ExternalStorageTimeoutError.name and details', () => {
    const e = new ExternalStorageTimeoutError('dev', 'user')
    expect(e.name).toBe('External Storage Timeout')
    expect(typeof e.details).toBe('string')
  })

  it('ExternalStorageTimeoutError — with cause', () => {
    const cause = new Error('storage')
    const e = new ExternalStorageTimeoutError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('GatewayTimeoutError.name and details', () => {
    const e = new GatewayTimeoutError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('GatewayTimeoutError — with cause', () => {
    const cause = new Error('gtw')
    const e = new GatewayTimeoutError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('InsufficientStorageError.name and details', () => {
    const e = new InsufficientStorageError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('InsufficientStorageError — with cause', () => {
    const cause = new Error('storage')
    const e = new InsufficientStorageError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('InternalServerError.details', () => {
    const e = new InternalServerError('dev', 'user')
    expect(typeof e.details).toBe('string')
  })

  it('NetworkAuthenticationRequiredError.name and details', () => {
    const e = new NetworkAuthenticationRequiredError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('NetworkAuthenticationRequiredError — with cause', () => {
    const cause = new Error('net')
    const e = new NetworkAuthenticationRequiredError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('NotImplementedError.name and details', () => {
    const e = new NotImplementedError('dev', 'user')
    expect(e.name).toBeDefined()
    expect(typeof e.details).toBe('string')
  })

  it('NotImplementedError — with cause', () => {
    const cause = new Error('ni')
    const e = new NotImplementedError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })

  it('ServiceUnavailableError.details', () => {
    const e = new ServiceUnavailableError('dev', 'user')
    expect(typeof e.details).toBe('string')
  })

  it('ServiceUnavailableError — with cause', () => {
    const cause = new Error('sv')
    const e = new ServiceUnavailableError('dev', 'user', { cause })
    expect(e.cause).toBe(cause)
  })
})
