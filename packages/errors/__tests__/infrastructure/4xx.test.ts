import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AppError } from '../../entities/ports/AppError.ts'
import { BadRequestError } from '../../infrastructure/4xx/BadRequestError.ts'
import { ConflictError } from '../../infrastructure/4xx/ConflictError.ts'
import { ForbiddenError } from '../../infrastructure/4xx/ForbiddenError.ts'
import { NotFoundError } from '../../infrastructure/4xx/NotFoundError.ts'
import { TooManyRequestsError } from '../../infrastructure/4xx/TooManyRequestsError.ts'
import { UnauthorizedError } from '../../infrastructure/4xx/UnauthorizedError.ts'
import { UnprocessableEntityError } from '../../infrastructure/4xx/UnprocessableEntityError.ts'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'

describe('4xx error classes', () => {
  describe('NotFoundError', () => {
    it('has status 404', () => {
      const err = new NotFoundError('not found', 'Resource not found.')
      expect(err.status).toBe(404)
    })

    it('extends AppError and Error', () => {
      const err = new NotFoundError('not found', 'Resource not found.')
      expect(err).toBeInstanceOf(AppError)
      expect(err).toBeInstanceOf(Error)
    })

    it('exposes name "Not Found"', () => {
      const err = new NotFoundError('not found', 'Resource not found.')
      expect(err.name).toBe('Not Found')
    })

    it('stores cause', () => {
      const cause = new Error('db miss')
      const err = new NotFoundError('not found', 'Resource not found.', { cause })
      expect(err.cause).toBe(cause)
    })
  })

  describe('BadRequestError', () => {
    it('has status 400', () => {
      const err = new BadRequestError('bad input', 'Check your request.')
      expect(err.status).toBe(400)
    })

    it('has name "Bad Request"', () => {
      const err = new BadRequestError('bad input', 'Check your request.')
      expect(err.name).toBe('Bad Request')
    })
  })

  describe('UnauthorizedError', () => {
    it('has status 401', () => {
      const err = new UnauthorizedError('no auth', 'Please log in.')
      expect(err.status).toBe(401)
    })
  })

  describe('ForbiddenError', () => {
    it('has status 403', () => {
      const err = new ForbiddenError('forbidden', 'Access denied.')
      expect(err.status).toBe(403)
    })
  })

  describe('ConflictError', () => {
    it('has status 409', () => {
      const err = new ConflictError('conflict', 'Resource already exists.')
      expect(err.status).toBe(409)
    })
  })

  describe('TooManyRequestsError', () => {
    it('has status 429', () => {
      const err = new TooManyRequestsError('rate limited', 'Slow down.')
      expect(err.status).toBe(429)
    })
  })

  describe('UnprocessableEntityError', () => {
    it('has status 422', () => {
      const err = new UnprocessableEntityError('unprocessable', 'Cannot process entity.')
      expect(err.status).toBe(422)
    })
  })

  describe('ValidationError', () => {
    it('has status 400', () => {
      const err = new ValidationError('validation failed', 'Check your input.')
      expect(err.status).toBe(400)
    })

    it('has name "Validation Error"', () => {
      const err = new ValidationError('validation failed', 'Check your input.')
      expect(err.name).toBe('Validation Error')
    })

    it('stores validation errors in cause', () => {
      const validationErrors = [
        { path: 'email', message: 'Required' },
        { path: 'age', message: 'Must be positive' },
      ]
      const err = new ValidationError('failed', 'Fix input.', { cause: { validationErrors } })
      expect((err.cause as { validationErrors: unknown[] }).validationErrors).toEqual(
        validationErrors,
      )
    })

    it('works with a real Zod schema failure', () => {
      const schema = z.object({ email: z.string().email(), age: z.number().positive() })
      const result = schema.safeParse({ email: 'not-an-email', age: -1 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const validationErrors = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }))
        const err = new ValidationError('Zod validation failed', 'Please fix your input.', {
          cause: { validationErrors },
        })
        expect(err.status).toBe(400)
        expect(
          (err.cause as { validationErrors: { path: string; message: string }[] }).validationErrors,
        ).toHaveLength(2)
      }
    })
  })
})
