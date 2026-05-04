import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: resolve(__dirname),
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    // Use forks pool so vi.stubGlobal / module resets work cleanly
    pool: 'forks',
  },
})
