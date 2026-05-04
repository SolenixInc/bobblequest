import { describe, expect, it } from 'vitest'
import { AppError } from '../../entities/ports/AppError.ts'
import { BadGatewayError } from '../../infrastructure/5xx/BadGatewayError.ts'
import { ExternalStorageTimeoutError } from '../../infrastructure/5xx/ExternalStorageTimeoutError.ts'
import { GatewayTimeoutError } from '../../infrastructure/5xx/GatewayTimeoutError.ts'
import { InsufficientStorageError } from '../../infrastructure/5xx/InsufficientStorageError.ts'
import { InternalServerError } from '../../infrastructure/5xx/InternalServerError.ts'
import { NetworkAuthenticationRequiredError } from '../../infrastructure/5xx/NetworkAuthenticationRequiredError.ts'
import { NotImplementedError } from '../../infrastructure/5xx/NotImplementedError.ts'
import { ServiceUnavailableError } from '../../infrastructure/5xx/ServiceUnavailableError.ts'

describe('5xx error classes', () => {
  describe('InternalServerError', () => {
    it('has status 500', () => {
      const err = new InternalServerError('crash', 'Something went wrong.')
      expect(err.status).toBe(500)
    })

    it('extends AppError and Error', () => {
      const err = new InternalServerError('crash', 'Something went wrong.')
      expect(err).toBeInstanceOf(AppError)
      expect(err).toBeInstanceOf(Error)
    })

    it('has name "Internal Server Error"', () => {
      const err = new InternalServerError('crash', 'Something went wrong.')
      expect(err.name).toBe('Internal Server Error')
    })

    it('stores cause', () => {
      const cause = new Error('db down')
      const err = new InternalServerError('crash', 'Something went wrong.', { cause })
      expect(err.cause).toBe(cause)
    })

    it('sets message correctly', () => {
      const err = new InternalServerError('detailed message', 'Generic user message.')
      expect(err.message).toBe('detailed message')
      expect(err.responseMessage).toBe('Generic user message.')
    })
  })

  describe('ServiceUnavailableError', () => {
    it('has status 503', () => {
      const err = new ServiceUnavailableError('maintenance', 'Try again later.')
      expect(err.status).toBe(503)
    })

    it('has name "Service Unavailable"', () => {
      const err = new ServiceUnavailableError('maintenance', 'Try again later.')
      expect(err.name).toBe('Service Unavailable')
    })
  })

  describe('BadGatewayError', () => {
    it('has status 502', () => {
      const err = new BadGatewayError('upstream failed', 'Service error.')
      expect(err.status).toBe(502)
    })
  })

  describe('GatewayTimeoutError', () => {
    it('has status 504', () => {
      const err = new GatewayTimeoutError('timeout', 'Request timed out.')
      expect(err.status).toBe(504)
    })
  })

  describe('NotImplementedError', () => {
    it('has status 501', () => {
      const err = new NotImplementedError('not done', 'Feature not available.')
      expect(err.status).toBe(501)
    })
  })

  describe('InsufficientStorageError', () => {
    it('has status 507', () => {
      const err = new InsufficientStorageError('no space', 'Storage full.')
      expect(err.status).toBe(507)
    })
  })

  describe('NetworkAuthenticationRequiredError', () => {
    it('has status 511', () => {
      const err = new NetworkAuthenticationRequiredError('network auth', 'Network login required.')
      expect(err.status).toBe(511)
    })
  })

  describe('ExternalStorageTimeoutError', () => {
    it('has status 504', () => {
      const err = new ExternalStorageTimeoutError('storage timeout', 'External storage timed out.')
      expect(err.status).toBe(504)
    })
  })
})
