import '@testing-library/jest-dom/vitest'

// Stub logging for tests
export const createGlobalLogger = () => ({
  warning: () => {},
  error: () => {},
  info: () => {},
  debug: () => {},
})
