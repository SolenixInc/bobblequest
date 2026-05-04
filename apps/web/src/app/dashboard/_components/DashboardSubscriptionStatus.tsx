'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEntitlement } from '@t/billing-browser'

/**
 * Displays the current user's Pro subscription status.
 * Uses the billing tracker from BillingProvider (must be rendered inside AppBillingProvider).
 */
export function DashboardSubscriptionStatus() {
  const { isActive, expirationDate, isLoading } = useEntitlement('pro')

  return (
    <Card data-testid="dashboard-subscription-card" className="max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pro</CardTitle>
          {!isLoading && (
            <Badge variant={isActive ? 'default' : 'destructive'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
          {isLoading && <Badge variant="secondary">Loading…</Badge>}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Entitlement</dt>
            <dd className="font-medium">Pro</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium">{isActive && expirationDate ? expirationDate : '—'}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            disabled
          >
            Manage subscription
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
