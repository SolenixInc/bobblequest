// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  fakeLogger: { info: () => {}, error: () => {}, warn: () => {} },
  resolveMock: vi.fn(),
  getContainerMock: vi.fn(),
}))

mocks.resolveMock.mockReturnValue(mocks.fakeLogger)
mocks.getContainerMock.mockReturnValue({ resolve: mocks.resolveMock })

vi.mock('./composition', () => ({
  getContainer: mocks.getContainerMock,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.resolveMock.mockClear()
  mocks.getContainerMock.mockClear()
  mocks.resolveMock.mockReturnValue(mocks.fakeLogger)
  mocks.getContainerMock.mockReturnValue({ resolve: mocks.resolveMock })
})

it('logger equals the value returned by container.resolve', async () => {
  const { logger } = await import('./logger')
  expect(logger).toBe(mocks.fakeLogger)
})

it('resolve was called with the LOGGER dependency key', async () => {
  await import('./logger')
  const { dependencyKeys } = await import('@t/dependency-injection')
  expect(mocks.resolveMock).toHaveBeenCalledWith(dependencyKeys.global.LOGGER)
})

it('getContainer was called', async () => {
  await import('./logger')
  expect(mocks.getContainerMock).toHaveBeenCalled()
})
