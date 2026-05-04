import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import { ClerkAnalyticsBridge } from './analytics-bridge'
import { DesktopBillingProvider } from './billing/DesktopBillingProvider'
import { CLERK_PUBLISHABLE_KEY, ClerkProvider, useAuth } from './clerk'
import { desktopClientConfig } from './clientConfig'
import { trpc } from './trpc'

function InnerTrpcProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: desktopClientConfig.trpc.url,
          async headers() {
            const token = await getToken?.()
            const headers: Record<string, string> = token
              ? { authorization: `Bearer ${token}` }
              : {}

            // Pass PostHog session and distinct IDs to the API for session continuity.
            const sessionId = posthog.get_session_id()
            const distinctId = posthog.get_distinct_id()
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

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (desktopClientConfig.posthog.key) {
      posthog.init(desktopClientConfig.posthog.key, {
        api_host: desktopClientConfig.posthog.host ?? 'https://us.i.posthog.com',
        capture_pageview: false,
        capture_performance: true,
        person_profiles: 'identified_only',
        session_recording: {},
      })
    }
  }, [])

  // Gate ClerkProvider on the publishable key being present — absent key means
  // auth is disabled (matching the web app's isClerkConfigured() pattern in layout.tsx).
  // This allows a fresh clone with placeholder .env vars to still render the app.
  const inner = (
    <InnerTrpcProvider>
      <DesktopBillingProvider>{children}</DesktopBillingProvider>
    </InnerTrpcProvider>
  )

  return (
    <PostHogProvider client={posthog}>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>{inner}</ClerkProvider>
      ) : (
        inner
      )}
    </PostHogProvider>
  )
}
