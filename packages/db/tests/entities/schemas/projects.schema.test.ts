import { describe, expect, it } from 'vitest'
import { projects } from '../../../src/entities/schemas/projects.ts'

describe('projects schema', () => {
  it('exposes the expected columns', () => {
    const columnNames = Object.keys(projects)
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'description',
        'status',
        'ownerId',
        'createdAt',
        'updatedAt',
      ]),
    )
  })

  it('maps camelCase columns to snake_case SQL names', () => {
    const ownerCol = (projects as unknown as Record<string, { name: string }>).ownerId
    const createdCol = (projects as unknown as Record<string, { name: string }>).createdAt
    const updatedCol = (projects as unknown as Record<string, { name: string }>).updatedAt
    expect(ownerCol?.name).toBe('owner_id')
    expect(createdCol?.name).toBe('created_at')
    expect(updatedCol?.name).toBe('updated_at')
  })
})
