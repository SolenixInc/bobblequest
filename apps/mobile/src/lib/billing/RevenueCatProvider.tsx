/**
 * RevenueCat provider for the mobile app.
 *
 * Configures react-native-purchases on mount using platform-specific keys
 * sourced from EXPO_PUBLIC_REVENUECAT_APPLE_KEY (iOS) and
 * EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY (Android).
 *
 * When either key is absent the provider no-ops — safe for template usage
 * where consuming projects supply real keys via their own .env files.
 *
 * useRcCustomerInfo() returns the latest CustomerInfo or null when RC is
 * not configured.
 */
import { useUser } from '@clerk/clerk-expo'
import { dependencyKeys } from '@t/dependency-injection'
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases'
import { getContainer } from '../composition'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface RcContextValue {
  customerInfo: CustomerInfo | null
}

const RcContext = createContext<RcContextValue>({ customerInfo: null })

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const configured = useRef(false)
  const { user } = useUser()

  const container = getContainer()
  const config = container.resolve(dependencyKeys.global.CONFIG)
  const apiKey =
    Platform.OS === 'ios' ? config.revenueCat.appleApiKey : config.revenueCat.googleApiKey
  const rcEnabled = Boolean(apiKey)

  // Configure once on mount
  useEffect(() => {
    if (!rcEnabled || !apiKey || configured.current) return

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG)
    }

    Purchases.configure({ apiKey })
    configured.current = true

    // Fetch initial customer info
    Purchases.getCustomerInfo()
      .then(setCustomerInfo)
      .catch(() => {
        // Swallow — network may be unavailable; info will refresh on next purchase event
      })

    const listener = Purchases.addCustomerInfoUpdateListener(setCustomerInfo)
    return () => {
      listener.remove()
    }
  }, [apiKey, rcEnabled])

  // Identify / logout when Clerk user changes
  useEffect(() => {
    if (!rcEnabled || !configured.current) return

    if (user?.id) {
      Purchases.logIn(user.id)
        .then(({ customerInfo: info }) => setCustomerInfo(info))
        .catch(() => {
          // Non-fatal — RC will still work anonymously
        })
    } else {
      Purchases.logOut()
        .then(setCustomerInfo)
        .catch(() => {})
    }
  }, [user?.id, rcEnabled])

  return <RcContext.Provider value={{ customerInfo }}>{children}</RcContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useRcCustomerInfo(): CustomerInfo | null {
  return useContext(RcContext).customerInfo
}
