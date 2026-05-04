'use client'

import { useAnalytics } from '@t/analytics-browser'
import { useEffect } from 'react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const analytics = useAnalytics()

  useEffect(() => {
    analytics.captureException(error, 'anonymous')
  }, [error, analytics])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
