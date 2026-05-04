import { getAnalytics } from '../infrastructure/init'

/**
 * Hook to consume analytics tracker instance.
 * Must be used within AnalyticsProvider or after initAnalytics has been called.
 */
export const useAnalytics = () => {
  const analytics = getAnalytics()
  return analytics
}
