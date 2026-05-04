import type { AppRouter } from '@t/api'
import { dependencyKeys } from '@t/dependency-injection'
import { createTRPCReact } from '@trpc/react-query'
import { getContainer } from './composition'

// TODO: import from @nutraforgetechnologies/ai — wire streaming chat / completion client here once Platform SDK ships
export const trpc = createTRPCReact<AppRouter>()

export const getTrpcUrl = (): string => {
  const container = getContainer()
  const config = container.resolve(dependencyKeys.global.CONFIG)
  return config.client.trpcUrl
}
