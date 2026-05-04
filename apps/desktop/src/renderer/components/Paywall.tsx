import { useBilling, useBillingContext } from '../lib/billing/DesktopBillingProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaywallProps {
  /** Called after a successful purchase — refresh app state here. */
  onPurchaseCompleted?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Paywall — lists available RevenueCat offerings and presents a purchase CTA
 * per package. Renders a no-op notice when billing is not configured.
 *
 * Renderer-only: uses browser/Electron context exclusively.
 */
export function Paywall({ onPurchaseCompleted }: PaywallProps) {
  const purchases = useBilling()
  const { offerings, isLoading, customerInfo } = useBillingContext()

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <output
        aria-label="Loading plans"
        className="flex items-center justify-center p-8 text-muted-foreground"
      >
        <span className="animate-pulse">Loading plans…</span>
      </output>
    )
  }

  // ── No billing key present ───────────────────────────────────────────────

  if (!purchases) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground"
      >
        Billing is not configured in this build.
      </div>
    )
  }

  // ── No offerings returned ────────────────────────────────────────────────

  if (!offerings || offerings.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground"
      >
        No plans are available right now. Please try again later.
      </div>
    )
  }

  // ── Offerings grid ───────────────────────────────────────────────────────

  return (
    <section aria-labelledby="paywall-heading" className="space-y-6">
      <h2 id="paywall-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        Choose a plan
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerings.map((offering) =>
          offering.availablePackages.map((pkg) => {
            const product = pkg.webBillingProduct
            const price = product.currentPrice
            const isOwned = !!customerInfo?.activeSubscriptions?.has(product.identifier)

            return (
              <article
                key={pkg.identifier}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
                aria-label={`${product.title} plan`}
              >
                {/* Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-card-foreground">{product.title}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {price ? price.formattedPrice : '—'}
                  </span>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled={isOwned}
                  aria-label={
                    isOwned ? `${product.title} — current plan` : `Subscribe to ${product.title}`
                  }
                  className="mt-auto inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await purchases?.purchase({ rcPackage: pkg })
                      onPurchaseCompleted?.()
                    } catch (err) {
                      // RevenueCat throws a typed PurchasesError on cancellation.
                      // errorCode 1 = USER_CANCELLED — swallow silently.
                      const code = (err as { errorCode?: number }).errorCode
                      if (code !== 1) {
                        console.error('[Paywall] purchase error:', err)
                      }
                    }
                  }}
                >
                  {isOwned ? 'Current plan' : 'Subscribe'}
                </button>
              </article>
            )
          }),
        )}
      </div>
    </section>
  )
}
