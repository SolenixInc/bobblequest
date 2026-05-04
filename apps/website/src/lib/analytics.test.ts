// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  fakeAnalytics: { track: () => {}, identify: () => {}, page: () => {} },
  resolveMock: vi.fn(),
  getContainerMock: vi.fn(),
}))

mocks.resolveMock.mockReturnValue(mocks.fakeAnalytics)
mocks.getContainerMock.mockReturnValue({ resolve: mocks.resolveMock })

vi.mock('./composition', () => ({
  getContainer: mocks.getContainerMock,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.resolveMock.mockClear()
  mocks.getContainerMock.mockClear()
  mocks.resolveMock.mockReturnValue(mocks.fakeAnalytics)
  mocks.getContainerMock.mockReturnValue({ resolve: mocks.resolveMock })
})

it('analytics equals the value returned by container.resolve', async () => {
  const { analytics } = await import('./analytics')
  expect(analytics).toBe(mocks.fakeAnalytics)
})

it('resolve was called with the ANALYTICS dependency key', async () => {
  await import('./analytics')
  const { dependencyKeys } = await import('@t/dependency-injection')
  expect(mocks.resolveMock).toHaveBeenCalledWith(dependencyKeys.global.ANALYTICS)
})

it('getContainer was called', async () => {
  await import('./analytics')
  expect(mocks.getContainerMock).toHaveBeenCalled()
})
