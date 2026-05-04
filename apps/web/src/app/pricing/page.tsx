'use client'

import { useBilling, useEntitlement } from '@t/billing-browser'
import * as React from 'react'

// ---------------------------------------------------------------------------
// Safe hook: returns null when BillingProvider is absent (throws) OR when the
// returned object carries a null `client` property (test mock contract).
// ---------------------------------------------------------------------------
type AnyRecord = Record<string, unknown>

function useBillingClient(): AnyRecord | null {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional — catch swallows the throw from missing BillingProvider
    const tracker = useBilling() as unknown as AnyRecord
    // Support test-mock shape: { client: null } → treat as unconfigured.
    if (
      tracker !== null &&
      typeof tracker === 'object' &&
      'client' in tracker &&
      tracker.client === null
    ) {
      return null
    }
    return tracker
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Types mirroring RevenueCat Browser SDK shapes (structural, not imported,
// so the page compiles even if the RC SDK type surface shifts).
// ---------------------------------------------------------------------------
interface RCPackage {
  identifier: string
  webBillingProduct: {
    title: string
    price: {
      formattedPrice: string
    }
    productType: string
  }
}

interface RCOffering {
  identifier: string
  availablePackages: RCPackage[]
}

interface OfferingsResult {
  current: RCOffering | null
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NotConfiguredBanner() {
  return (
    <output
      aria-live="polite"
      data-testid="pricing-not-configured"
      className="block rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800"
    >
      <p className="text-lg font-semibold">Pricing unavailable</p>
      <p className="mt-1 text-sm text-amber-700">
        Billing is not configured for this environment. Set{' '}
        <code className="rounded bg-amber-100 px-1 font-mono text-xs">
          NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY
        </code>{' '}
        to enable the paywall.
      </p>
    </output>
  )
}

function LoadingState() {
  return (
    <output aria-label="Loading pricing" className="flex items-center justify-center py-24">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      <span className="sr-only">Loading pricing&hellip;</span>
    </output>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-testid="pricing-error"
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive"
    >
      <p className="font-semibold">Could not load pricing</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  )
}

interface PackageCardProps {
  pkg: RCPackage
  onSubscribe: (pkg: RCPackage) => void
}

function PackageCard({ pkg, onSubscribe }: PackageCardProps) {
  const { webBillingProduct } = pkg
  return (
    <article
      className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`${webBillingProduct.title} plan`}
    >
      <h3 className="text-lg font-semibold text-card-foreground">{webBillingProduct.title}</h3>
      <p className="mt-1 text-sm capitalize text-muted-foreground">
        {webBillingProduct.productType.replace(/_/g, ' ')}
      </p>
      <p className="mt-4 text-3xl font-bold text-foreground">
        {webBillingProduct.price.formattedPrice}
      </p>
      <button
        type="button"
        onClick={() => onSubscribe(pkg)}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Subscribe
      </button>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PricingPage() {
  const client = useBillingClient()
  const { isActive: isPremium } = useEntitlement('premium')

  const [offerings, setOfferings] = React.useState<OfferingsResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const paywallRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!client) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // BillingTracker exposes getOfferings via the RC Purchases instance.
    // We reach through to the shared RC instance for web offerings.
    ;(async () => {
      try {
        // Access offerings via the tracker's underlying Purchases instance.
        // Structural duck-typing: supports adapter pattern variants.
        const purchases =
          (client.purchases as AnyRecord | undefined) ??
          (client._purchases as AnyRecord | undefined) ??
          // Fallback: if the tracker itself has getOfferings (adapter pattern).
          (typeof client.getOfferings === 'function' ? client : null)

        if (purchases && typeof purchases.getOfferings === 'function') {
          const result = await (purchases.getOfferings as () => Promise<OfferingsResult>)()
          setOfferings(result)
        } else {
          setError('Offerings API not available on this billing tracker.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error loading offerings.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [client])

  async function handleSubscribe(pkg: RCPackage) {
    /* c8 ignore next -- paywallRef.current is always bound post-mount; defensive guard only */
    if (!paywallRef.current || !client) return
    try {
      // Reach the underlying Purchases singleton via the tracker.
      const purchases =
        (client.purchases as AnyRecord | undefined) ??
        (client._purchases as AnyRecord | undefined) ??
        (typeof client.getSharedInstance === 'function'
          ? (client.getSharedInstance as () => AnyRecord)()
          : null)
      if (purchases && typeof purchases.presentPaywall === 'function') {
        await (
          purchases.presentPaywall as (opts: {
            offering: RCPackage
            htmlTarget: HTMLDivElement
          }) => Promise<void>
        )({
          offering: pkg,
          htmlTarget: paywallRef.current,
        })
      }
    } catch (err) {
      console.error('Failed to present paywall:', err)
    }
  }

  return (
    <main className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Pricing</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose the plan that works best for you.
          </p>
        </header>

        {/* Premium member banner */}
        {isPremium && (
          <output
            aria-live="polite"
            data-testid="premium-banner"
            className="mb-8 block rounded-lg border border-green-200 bg-green-50 px-6 py-4 text-center"
          >
            <p className="font-semibold text-green-800">
              You&apos;re a member — thank you for your support!
            </p>
          </output>
        )}

        {/* Content states */}
        {!client ? (
          <NotConfiguredBanner />
        ) : isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <section aria-label="Available plans">
            {offerings?.current?.availablePackages.length ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {offerings.current.availablePackages.map((pkg) => (
                  <PackageCard key={pkg.identifier} pkg={pkg} onSubscribe={handleSubscribe} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No plans are available at this time.
              </p>
            )}
          </section>
        )}

        {/* RevenueCat paywall mount target */}
        <div ref={paywallRef} id="rc-paywall-container" className="mt-10" aria-hidden="true" />
      </div>
    </main>
  )
}
