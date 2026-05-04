import { describe, expect, it } from 'vitest'
import { toUnknownErrorResponse } from '../../applications/toUnknownErrorResponse.ts'

describe('toUnknownErrorResponse — branch coverage', () => {
  it('truncates non-HTML message longer than 500 chars', () => {
    const longMsg = 'a'.repeat(600)
    const response = toUnknownErrorResponse(new Error(longMsg), undefined, 'development')
    expect(response.message?.length).toBeLessThanOrEqual(500)
  })

  it('preserves non-HTML message within 500 chars unchanged', () => {
    const msg = 'short message'
    const response = toUnknownErrorResponse(new Error(msg), undefined, 'development')
    expect(response.message).toBe(msg)
  })

  it('handles empty message without throwing', () => {
    const response = toUnknownErrorResponse(new Error(''), undefined, 'development')
    expect(response.message).toBe('')
  })

  it('includes stack in testing environment', () => {
    const response = toUnknownErrorResponse(new Error('oops'), undefined, 'testing')
    expect(response.stack).toBeDefined()
  })
})
