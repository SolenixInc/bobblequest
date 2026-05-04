'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#111',
        }}
      >
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '24rem',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Something went wrong
          </h2>
          {error.digest && (
            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.75rem',
                color: '#6b7280',
                fontFamily: 'monospace',
              }}
            >
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              background: '#111',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
