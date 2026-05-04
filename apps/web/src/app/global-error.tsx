'use client'

import { getAnalytics } from '@t/analytics-browser'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    getAnalytics().captureException(error, 'anonymous')
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm">Something went wrong.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
