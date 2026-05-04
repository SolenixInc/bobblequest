'use client'

import { webClientConfig } from '@/lib/clientConfig'
import { useAuth } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import posthog from 'posthog-js'
import { useState } from 'react'
import { trpc } from './client'

/**
 * Inner tRPC provider that reads the Clerk auth token for authenticated requests.
 * Only rendered when ClerkProvider is present in the tree.
 */
function AuthedTrpcProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: webClientConfig.trpc.url,
          async headers() {
            const token = await getToken?.()
            const headers: Record<string, string> = token
              ? { authorization: `Bearer ${token}` }
              : {}

            if (typeof window !== 'undefined') {
              const sessionId = posthog.get_session_id()
              const distinctId = posthog.get_distinct_id()
              if (sessionId) headers['x-posthog-session-id'] = sessionId
              if (distinctId) headers['x-posthog-distinct-id'] = distinctId
            }

            return headers
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

/**
 * App-level tRPC provider.
 *
 * When Clerk is configured, delegates to AuthedTrpcProvider which calls
 * useAuth() to attach Bearer tokens to outbound tRPC requests.
 *
 * When Clerk is absent (fresh clone / placeholder env), falls back to an
 * unauthenticated tRPC client — requests still work for public procedures.
 * This prevents the "useAuth can only be used within the <ClerkProvider />
 * component" error when CLERK_SECRET_KEY is not set.
 */
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(webClientConfig.clerk.publishableKey)

  const [queryClient] = useState(() => new QueryClient())
  const [anonTrpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: webClientConfig.trpc.url,
          async headers() {
            const headers: Record<string, string> = {}
            if (typeof window !== 'undefined') {
              const sessionId = posthog.get_session_id()
              const distinctId = posthog.get_distinct_id()
              if (sessionId) headers['x-posthog-session-id'] = sessionId
              if (distinctId) headers['x-posthog-distinct-id'] = distinctId
            }
            return headers
          },
        }),
      ],
    }),
  )

  if (!clerkConfigured) {
    return (
      <trpc.Provider client={anonTrpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    )
  }

  return <AuthedTrpcProvider>{children}</AuthedTrpcProvider>
}
