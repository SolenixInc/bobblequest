import { getAnalytics } from '../infrastructure/init'

/**
 * Hook to consume analytics tracker instance.
 * Must be used after initAnalytics has been called.
 */
export const useAnalytics = () => {
  const analytics = getAnalytics()
  return analytics
}
