import { describe, expect, it } from 'vitest'
import { users } from '../../../src/entities/schemas/users.ts'

describe('users schema', () => {
  it('exposes the expected columns', () => {
    const columnNames = Object.keys(users)
    // Drizzle attaches metadata on the table object; columns live on the
    // proxy under their JS names.
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'clerkUserId',
        'email',
        'displayName',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ]),
    )
  })

  it('maps camelCase columns to snake_case SQL names', () => {
    const clerkCol = (users as unknown as Record<string, { name: string }>).clerkUserId
    const createdCol = (users as unknown as Record<string, { name: string }>).createdAt
    expect(clerkCol?.name).toBe('clerk_user_id')
    expect(createdCol?.name).toBe('created_at')
  })
})
