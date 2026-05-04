import { describe, expect, test } from 'vitest'
import { DesktopClientConfigSchema } from '../DesktopClientConfigSchema.ts'

const VALID = {
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
  VITE_API_URL: 'http://localhost:3001/trpc',
  VITE_REVENUECAT_PUBLIC_API_KEY: 'rcb_abc123',
}

describe('DesktopClientConfigSchema', () => {
  test('accepts all required fields', () => {
    const result = DesktopClientConfigSchema.parse(VALID)
    expect(result.VITE_CLERK_PUBLISHABLE_KEY).toBe('pk_test_abc123')
    expect(result.VITE_API_URL).toBe('http://localhost:3001/trpc')
    expect(result.VITE_REVENUECAT_PUBLIC_API_KEY).toBe('rcb_abc123')
  })

  test('rejects missing VITE_CLERK_PUBLISHABLE_KEY', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      VITE_API_URL: VALID.VITE_API_URL,
      VITE_REVENUECAT_PUBLIC_API_KEY: VALID.VITE_REVENUECAT_PUBLIC_API_KEY,
    })
    expect(success).toBe(false)
  })

  test('rejects missing VITE_API_URL', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      VITE_CLERK_PUBLISHABLE_KEY: VALID.VITE_CLERK_PUBLISHABLE_KEY,
      VITE_REVENUECAT_PUBLIC_API_KEY: VALID.VITE_REVENUECAT_PUBLIC_API_KEY,
    })
    expect(success).toBe(false)
  })

  test('rejects missing VITE_REVENUECAT_PUBLIC_API_KEY', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      VITE_CLERK_PUBLISHABLE_KEY: VALID.VITE_CLERK_PUBLISHABLE_KEY,
      VITE_API_URL: VALID.VITE_API_URL,
    })
    expect(success).toBe(false)
  })

  test('rejects empty VITE_CLERK_PUBLISHABLE_KEY', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      ...VALID,
      VITE_CLERK_PUBLISHABLE_KEY: '',
    })
    expect(success).toBe(false)
  })

  test('rejects empty VITE_API_URL', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      ...VALID,
      VITE_API_URL: '',
    })
    expect(success).toBe(false)
  })

  test('rejects empty VITE_REVENUECAT_PUBLIC_API_KEY', () => {
    const { success } = DesktopClientConfigSchema.safeParse({
      ...VALID,
      VITE_REVENUECAT_PUBLIC_API_KEY: '',
    })
    expect(success).toBe(false)
  })

  test('rejects completely empty object', () => {
    const { success } = DesktopClientConfigSchema.safeParse({})
    expect(success).toBe(false)
  })

  test('error messages mention the failing field name', () => {
    const result = DesktopClientConfigSchema.safeParse({})
    expect(result.success).toBe(false)
    if (result.success) return

    const paths = result.error.issues.map((issue) => issue.path)
    expect(paths).toContainEqual(['VITE_CLERK_PUBLISHABLE_KEY'])
    expect(paths).toContainEqual(['VITE_API_URL'])
    expect(paths).toContainEqual(['VITE_REVENUECAT_PUBLIC_API_KEY'])
  })
})
