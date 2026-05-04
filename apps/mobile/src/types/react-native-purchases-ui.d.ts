/**
 * Minimal type shim for react-native-purchases-ui@10.x
 *
 * Provides just enough type coverage for the codebase to compile before the
 * package is physically installed. Replace with the real types once
 * `bun install` has run and the package is present in node_modules.
 */
declare module 'react-native-purchases-ui' {
  import type { ComponentType } from 'react'

  export enum PAYWALL_RESULT {
    NOT_PRESENTED = 'NOT_PRESENTED',
    ERROR = 'ERROR',
    CANCELLED = 'CANCELLED',
    PURCHASED = 'PURCHASED',
    RESTORED = 'RESTORED',
  }

  export interface PaywallProps {
    onDismiss?: () => void
    onPurchaseCompleted?: (result: { customerInfo: unknown }) => void
    onRestoreCompleted?: (result: { customerInfo: unknown }) => void
    onPurchaseError?: (error: Error) => void
  }

  const RevenueCatUI: {
    Paywall: ComponentType<PaywallProps>
    presentPaywall: (options?: { displayCloseButton?: boolean }) => Promise<PAYWALL_RESULT>
    presentPaywallIfNeeded: (options?: {
      requiredEntitlementIdentifier: string
      displayCloseButton?: boolean
    }) => Promise<PAYWALL_RESULT>
  }

  export default RevenueCatUI
}
