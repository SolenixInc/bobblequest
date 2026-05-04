# @t/billing-browser

Browser-side billing integration package. Wraps the RevenueCat web SDK behind the `BillingTracker`
port from `@t/billing/ports`, with a NoOp fallback for SSR and missing API keys.

## ADR-0001: Why a separate browser package

This package follows the **platform-package-split convention** (ADR-0001) established by
`@t/analytics-browser` and `@t/logging-browser`:

- **Separate browser package** — the RevenueCat Web SDK (`@revenuecat/purchases-js`) is a
  browser-only module. Importing it in a server bundle (Next.js RSC, apps/api) would pull in browser
  globals and break SSR. A dedicated `-browser` package keeps the SDK off the server bundle
  entirely.
- **Port subpath in `@t/billing`** — `@t/billing/ports` exports `BillingTracker`, `EntitlementInfo`,
  and `CustomerInfo` as zero-runtime TypeScript interfaces. App code depends only on the port; the
  SDK is an implementation detail. This mirrors how `@t/analytics-types` decouples analytics
  consumers from posthog-js.
- **Dynamic SDK import for SSR safety** — even within the browser package, the RevenueCat SDK is
  loaded via `await import('@revenuecat/purchases-js')` at runtime so that Next.js server-side
  pre-rendering of the provider tree does not execute SDK initialization. The `NoOpBillingTracker`
  is returned synchronously in all non-browser environments.

## Surface

| Export | Kind | Description |
| --- | --- | --- |
| `BillingProvider` | React component | Context provider; initializes RevenueCat SDK on mount via dynamic import. Renders children immediately (NoOp path renders synchronously). |
| `useBilling` | React hook | Returns the `BillingTracker` instance from context. Throws if called outside `BillingProvider`. |
| `useEntitlement` | React hook | `useEntitlement(id: string): EntitlementInfo \| null` — reads a single entitlement from the current customer. |
| `registerBillingBrowserDI` | DI helper | Binds `BILLING_BROWSER_TRACKER` token in the shared DI container to the active tracker instance. |
| `_resetForTests` | Test utility | Resets internal singleton state between test cases. Not exported from the package root in production builds. |

## Usage

### 1. Wrap the app in `BillingProvider`

```tsx
// apps/web/src/app/layout.tsx
import { BillingProvider } from "@t/billing-browser";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <BillingProvider>
          {children}
        </BillingProvider>
      </body>
    </html>
  );
}
```

### 2. Read an entitlement in a component

```tsx
// apps/web/src/app/dashboard/_components/SubscriptionStatus.tsx
"use client";

import { useEntitlement } from "@t/billing-browser";

export function DashboardSubscriptionStatus() {
  const pro = useEntitlement("pro");

  if (!pro?.isActive) {
    return <p>Free plan</p>;
  }
  return <p>Pro — expires {pro.expiresDate?.toLocaleDateString() ?? "never"}</p>;
}
```

### 3. Env var contract

| Variable | Required | Behaviour when absent |
| --- | --- | --- |
| `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` | No | `NoOpBillingTracker` is activated; all entitlement checks return `null`. Safe for local dev and CI. |
| `NEXT_PUBLIC_ENVIRONMENT` | No | Defaults to `"development"`. Used to select the RevenueCat sandbox vs production project. |

When `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY` is set, the real RevenueCat Web SDK is initialized. The
project team wires these env vars per deployment environment.
