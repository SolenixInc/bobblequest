/**
 * Type shim for @revenuecat/purchases-js@1.x
 *
 * Covers the subset of the SDK surface used by DesktopBillingProvider and
 * Paywall. Once the package is installed in node_modules the real types
 * from `dist/Purchases.es.d.ts` take precedence — this shim is a compile-time
 * fallback only.
 *
 * Key deltas from early shim versions (both were bugs):
 *   - configure() now takes a PurchasesConfig object (not two positional args)
 *   - Package.webBillingProduct (not rcBillingProduct)
 *   - Price.formattedPrice is string (not optional)
 *   - Product.currentPrice is Price (not optional)
 *   - EntitlementInfo.expirationDate is Date | null (not string | null)
 */
declare module '@revenuecat/purchases-js' {
  export interface Price {
    currency: string
    amountMicros: number
    /** Formatted price string including price and currency */
    formattedPrice: string
  }

  export interface Product {
    identifier: string
    /** @deprecated Use title instead */
    displayName: string
    title: string
    description: string | null
    /** @deprecated Use price instead */
    currentPrice: Price
    normalPeriodDuration: string | null
  }

  export interface Package {
    identifier: string
    /** @deprecated Use webBillingProduct instead */
    rcBillingProduct: Product
    webBillingProduct: Product
  }

  export interface Offering {
    identifier: string
    serverDescription: string
    availablePackages: Package[]
    metadata?: Record<string, unknown>
  }

  export interface Offerings {
    current: Offering | null
    all: Record<string, Offering>
  }

  export interface EntitlementInfo {
    identifier: string
    isActive: boolean
    willRenew: boolean
    periodType: string
    latestPurchaseDate: Date
    originalPurchaseDate: Date
    /** Date | null — NOT string */
    expirationDate: Date | null
    store: string
    productIdentifier: string
    isSandbox: boolean
  }

  export interface EntitlementInfos {
    active: Record<string, EntitlementInfo>
    all: Record<string, EntitlementInfo>
  }

  export interface CustomerInfo {
    originalAppUserId: string
    activeSubscriptions: Set<string>
    entitlements: EntitlementInfos
    requestDate: Date
    firstSeenDate: Date
    managementURL: string | null
    [key: string]: unknown
  }

  export interface PurchasesConfig {
    apiKey: string
    appUserId: string
  }

  export interface PurchaseParams {
    rcPackage: Package
  }

  export default class Purchases {
    /** Configure with an options object (recommended in v1.x+) */
    static configure(config: PurchasesConfig): Purchases
    getCustomerInfo(): Promise<CustomerInfo>
    getOfferings(): Promise<Offerings>
    purchase(params: PurchaseParams): Promise<{ customerInfo: CustomerInfo }>
  }
}
