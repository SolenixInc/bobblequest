/**
 * Minimal type shim for react-native-purchases@10.x
 *
 * Provides just enough type coverage for the codebase to compile before the
 * package is physically installed. Replace with the real types once
 * `bun install` has run and the package is present in node_modules.
 */
declare module 'react-native-purchases' {
  export interface CustomerInfo {
    activeSubscriptions: string[]
    entitlements: {
      active: Record<string, EntitlementInfo>
      all: Record<string, EntitlementInfo>
    }
    originalAppUserId: string
    requestDate: string
    firstSeen: string
    latestExpirationDate: string | null
    [key: string]: unknown
  }

  export interface EntitlementInfo {
    identifier: string
    isActive: boolean
    willRenew: boolean
    periodType: string
    latestPurchaseDate: string
    originalPurchaseDate: string
    expirationDate: string | null
    store: string
    productIdentifier: string
    isSandbox: boolean
    unsubscribeDetectedAt: string | null
    billingIssueDetectedAt: string | null
  }

  export interface LogInResult {
    customerInfo: CustomerInfo
    created: boolean
  }

  export interface PurchasesConfiguration {
    apiKey: string
    appUserID?: string | null
    observerMode?: boolean
    userDefaultsSuiteName?: string | null
    usesStoreKit2IfAvailable?: boolean
    useAmazon?: boolean
  }

  export enum LOG_LEVEL {
    VERBOSE = 'VERBOSE',
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
  }

  export interface CustomerInfoUpdateListener {
    remove: () => void
  }

  const Purchases: {
    configure(config: PurchasesConfiguration): void
    setLogLevel(level: LOG_LEVEL): void
    getCustomerInfo(): Promise<CustomerInfo>
    logIn(appUserID: string): Promise<LogInResult>
    logOut(): Promise<CustomerInfo>
    addCustomerInfoUpdateListener(
      listener: (info: CustomerInfo) => void,
    ): CustomerInfoUpdateListener
  }

  export default Purchases
}
