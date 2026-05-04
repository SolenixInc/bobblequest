import { usePathname, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { useAnalytics } from './useAnalytics'

/**
 * Hook to automatically capture page views when pathname changes.
 * Uses Next.js navigation hooks to detect route changes.
 *
 * Guards against SSR (window check) and only runs in browser.
 */
export const usePageView = () => {
  const analytics = useAnalytics()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    // Guard against SSR
    /* v8 ignore next */
    if (typeof window === 'undefined') return

    const url = `${pathname}?${searchParams.toString()}`
    // Use sessionId as distinctId — browser tracker manages identity internally.
    analytics.capture('$pageview', analytics.sessionId(), {
      $current_url: url,
    })
  }, [pathname, searchParams, analytics])
}
