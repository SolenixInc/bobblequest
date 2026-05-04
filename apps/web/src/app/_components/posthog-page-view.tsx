'use client'

import { ClerkAnalyticsBridge, usePageView } from '@t/analytics-browser'

function PageViewTracker() {
  usePageView()
  return null
}

export function PostHogPageView() {
  return (
    <>
      <PageViewTracker />
      <ClerkAnalyticsBridge />
    </>
  )
}
