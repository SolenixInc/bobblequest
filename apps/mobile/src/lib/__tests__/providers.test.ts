import { describe, expect, it } from 'vitest'
import { buildAuthHeaders } from '../auth-headers'

describe('buildAuthHeaders', () => {
  it('returns a Bearer authorization header when a token is provided', () => {
    expect(buildAuthHeaders('abc123')).toEqual({ authorization: 'Bearer abc123' })
  })

  it('returns an empty object when token is null', () => {
    expect(buildAuthHeaders(null)).toEqual({})
  })
})
