'use client'

import { Button } from '@/components/ui/button'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      posthog.captureException(error)
    } catch {
      // posthog not yet initialised
    }
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-muted-foreground">{error.digest}</p>
        )}
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
