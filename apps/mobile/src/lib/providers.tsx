import { dependencyKeys } from '@t/dependency-injection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { PostHogProvider, usePostHog } from 'posthog-react-native'
import { type ReactNode, useState } from 'react'
import { ClerkAnalyticsBridge } from './analytics-bridge'
import { buildAuthHeaders } from './auth-headers'
import { RevenueCatProvider } from './billing/RevenueCatProvider'
import { ClerkProvider, getClerkPublishableKey, tokenCache, useAuth } from './clerk'
import { getContainer } from './composition'
import { getTrpcUrl, trpc } from './trpc'

/**
 * Inner provider that has access to Clerk's `useAuth` hook and PostHog,
 * so the tRPC client can fetch session tokens and PostHog IDs per request.
 */
function TrpcProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()
  const posthog = usePostHog()
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          headers: async () => {
            const token = await getToken?.()
            const headers = buildAuthHeaders(token ?? null)

            // Pass PostHog session and distinct IDs to the API for session continuity.
            const sessionId = posthog?.getSessionId()
            const distinctId = posthog?.getDistinctId()
            if (sessionId) headers['x-posthog-session-id'] = sessionId
            if (distinctId) headers['x-posthog-distinct-id'] = distinctId

            return headers
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ClerkAnalyticsBridge />
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const container = getContainer()
  const config = container.resolve(dependencyKeys.global.CONFIG)
  const posthogKey = config.posthog.apiKey
  const posthogHost = config.posthog.host

  return (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        host: posthogHost,
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
          captureLog: true,
        },
      }}
    >
      <ClerkProvider publishableKey={getClerkPublishableKey()} tokenCache={tokenCache}>
        <RevenueCatProvider>
          <TrpcProvider>{children}</TrpcProvider>
        </RevenueCatProvider>
      </ClerkProvider>
    </PostHogProvider>
  )
}
