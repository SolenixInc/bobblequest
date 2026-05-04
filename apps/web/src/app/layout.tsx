import { PostHogPageView } from '@/app/_components/posthog-page-view'
import { AppAnalyticsProvider } from '@/app/providers/analytics-provider'
import { AppBillingProvider } from '@/app/providers/billing-provider'
import { logger } from '@/lib/logger'
import { isClerkConfiguredClient } from '@/lib/server/auth'
import { TrpcProvider } from '@/lib/trpc/provider'
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Template Web App',
  description: 'Authenticated product UI',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  logger.info({ message: 'web boot', metadata: { service: 'web' } })

  const inner = (
    <html lang="en">
      <body>
        <AppAnalyticsProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <TrpcProvider>
            <AppBillingProvider>{children}</AppBillingProvider>
          </TrpcProvider>
        </AppAnalyticsProvider>
      </body>
    </html>
  )

  // Gate ClerkProvider on the publishable key, not the secret key.
  // ClerkProvider is a client-side provider that only needs NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
  // CLERK_SECRET_KEY is required only for server-side auth() calls (e.g. dashboard/page.tsx).
  // Using the same publishable-key predicate as trpc/provider.tsx and billing-provider.tsx
  // ensures all three providers agree and prevents "useUser can only be used within
  // <ClerkProvider />" crashes when the secret key is absent but the publishable key is present.
  if (!isClerkConfiguredClient()) {
    logger.warning({
      message:
        'Auth disabled: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. ClerkProvider skipped.',
      metadata: { service: 'web' },
    })
    return inner
  }

  return <ClerkProvider>{inner}</ClerkProvider>
}
