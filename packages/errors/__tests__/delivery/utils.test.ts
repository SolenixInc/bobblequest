import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { convertZodErrorToValidationError } from '../../delivery/utils/convertZodErrorToValidationError.ts'
import { determineStatusCode } from '../../delivery/utils/determineStatusCode.ts'
import { extractValidationErrors } from '../../delivery/utils/extractValidationErrors.ts'
import { getErrorCategory } from '../../delivery/utils/getErrorCategory.ts'
import { getLogLevel } from '../../delivery/utils/getLogLevel.ts'
import { hasStatusCode } from '../../delivery/utils/hasStatusCode.ts'
import { NotFoundError } from '../../infrastructure/4xx/NotFoundError.ts'
import { UnauthorizedError } from '../../infrastructure/4xx/UnauthorizedError.ts'
import { ValidationError } from '../../infrastructure/4xx/ValidationError.ts'
import { InternalServerError } from '../../infrastructure/5xx/InternalServerError.ts'

describe('determineStatusCode', () => {
  it('returns AppError.status for AppError subclasses', () => {
    const err = new NotFoundError('not found', 'Resource not found.')
    expect(determineStatusCode(err)).toBe(404)
  })

  it('returns 500 for unknown AppError', () => {
    const err = new InternalServerError('crash', 'Something went wrong.')
    expect(determineStatusCode(err)).toBe(500)
  })

  it('returns statusCode from error with statusCode property', () => {
    const err = Object.assign(new Error('ext error'), { statusCode: 503 })
    expect(determineStatusCode(err)).toBe(503)
  })

  it('returns 500 for plain Error', () => {
    const err = new Error('unknown')
    expect(determineStatusCode(err)).toBe(500)
  })
})

describe('getErrorCategory', () => {
  it('returns "validation_zod" for ValidationError', () => {
    const err = new ValidationError('failed', 'Fix it.')
    expect(getErrorCategory(400, err)).toBe('validation_zod')
  })

  it('returns "authentication" for 401', () => {
    const err = new UnauthorizedError('no token', 'Login required.')
    expect(getErrorCategory(401, err)).toBe('authentication')
  })

  it('returns "not_found" for 404', () => {
    const err = new NotFoundError('missing', 'Not found.')
    expect(getErrorCategory(404, err)).toBe('not_found')
  })

  it('returns "server_error" for 500+', () => {
    const err = new InternalServerError('crash', 'Something went wrong.')
    expect(getErrorCategory(500, err)).toBe('server_error')
  })

  it('returns "client_error" for 4xx (non-special codes)', () => {
    const err = new NotFoundError('missing', 'Not found.')
    expect(getErrorCategory(409, err)).toBe('client_error')
  })

  it('returns "unknown" for unrecognized status', () => {
    const err = new Error('weird')
    expect(getErrorCategory(200, err)).toBe('unknown')
  })
})

describe('hasStatusCode', () => {
  it('returns true for errors with statusCode', () => {
    const err = Object.assign(new Error('ext'), { statusCode: 502 })
    expect(hasStatusCode(err)).toBe(true)
  })

  it('returns false for plain Error', () => {
    const err = new Error('plain')
    expect(hasStatusCode(err)).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(hasStatusCode('string')).toBe(false)
    expect(hasStatusCode(null)).toBe(false)
    expect(hasStatusCode({ statusCode: 404 })).toBe(false)
  })
})

describe('getLogLevel', () => {
  it('returns "warning" for 401', () => {
    expect(getLogLevel(401)).toBe('warning')
  })

  it('returns "warning" for 404', () => {
    expect(getLogLevel(404)).toBe('warning')
  })

  it('returns "info" for other 4xx', () => {
    expect(getLogLevel(400)).toBe('info')
    expect(getLogLevel(409)).toBe('info')
    expect(getLogLevel(422)).toBe('info')
    expect(getLogLevel(429)).toBe('info')
  })

  it('returns "error" for 5xx', () => {
    expect(getLogLevel(500)).toBe('error')
    expect(getLogLevel(503)).toBe('error')
  })
})

describe('convertZodErrorToValidationError', () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().positive(),
  })

  it('converts ZodError to ValidationError', () => {
    const result = schema.safeParse({ email: 'bad', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = convertZodErrorToValidationError(result.error)
      expect(err).toBeInstanceOf(ValidationError)
      expect(err.status).toBe(400)
    }
  })

  it('includes field paths in message', () => {
    const result = schema.safeParse({ email: 'bad', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = convertZodErrorToValidationError(result.error)
      expect(err.message).toContain('email')
    }
  })

  it('stores validationErrors in cause', () => {
    const result = schema.safeParse({ email: 'bad', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = convertZodErrorToValidationError(result.error)
      const cause = err.cause as { validationErrors: { path: string; message: string }[] }
      expect(Array.isArray(cause.validationErrors)).toBe(true)
      expect(cause.validationErrors.length).toBeGreaterThan(0)
    }
  })
})

describe('extractValidationErrors', () => {
  it('extracts path and message from ZodError issues', () => {
    const schema = z.object({ name: z.string().min(1) })
    const result = schema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = extractValidationErrors(result.error)
      expect(errors).toHaveLength(1)
      expect(errors[0]?.path).toBe('name')
      expect(typeof errors[0]?.message).toBe('string')
    }
  })

  it('joins nested paths with dot notation', () => {
    const schema = z.object({ user: z.object({ email: z.string().email() }) })
    const result = schema.safeParse({ user: { email: 'bad' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = extractValidationErrors(result.error)
      expect(errors[0]?.path).toBe('user.email')
    }
  })
})
