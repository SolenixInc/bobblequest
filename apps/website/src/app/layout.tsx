import { PostHogPageView } from '@/app/_components/posthog-page-view'
import { AppAnalyticsProvider } from '@/app/providers/analytics-provider'
import { getWebsiteConfig } from '@/lib/config'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import './globals.css'

// generateMetadata runs at request time — await connection() signals to Next.js
// that this segment must not be statically rendered without a real request.
// This is the correct pattern for server-only vars (SITE_URL has no NEXT_PUBLIC_ prefix
// and must NOT be inlined at next build time). The same Docker image runs in
// dev/staging/prod with different SITE_URL values, no rebuild required.
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const { siteUrl } = getWebsiteConfig()
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'Template Site',
      template: '%s · Template Site',
    },
    description: 'Marketing site scaffold for the template-repo monorepo.',
    openGraph: {
      type: 'website',
      siteName: 'Template Site',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppAnalyticsProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </AppAnalyticsProvider>
      </body>
    </html>
  )
}
