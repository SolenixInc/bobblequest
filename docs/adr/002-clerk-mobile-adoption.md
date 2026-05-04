---
adr: 002
status: accepted
date: 2026-04-26
last_audited: 2026-04-26
maintainer_contract: `<owner of apps/mobile>` revisits if Clerk pricing/SDK changes materially or if @t/auth port shape changes.
---

# 002 — Clerk Adoption for Mobile Auth

## Context

Mobile (apps/mobile) needs auth that mirrors web (@clerk/nextjs already shipped). Server-side
verification is unified through the @t/auth port (ClerkAuthProvider wraps @clerk/backend). What
remained: pick a client-side SDK + native Apple Sign-In path for the mobile app, while keeping
server contracts untouched.

## Decision

1. Adopt **@clerk/clerk-expo** (^2.19.31) for mobile auth, mirroring the @clerk/nextjs pattern on
   web.
2. Each app wires its own Clerk client SDK; server-side verification stays unified through the
   @t/auth port — no shared @t/clerk-client package.
3. Use the canonical built-in `tokenCache` from `@clerk/clerk-expo/token-cache` (wraps
   expo-secure-store), not a hand-rolled cache.
4. Native Apple Sign-In via `useSignInWithApple` from `@clerk/clerk-expo` — the canonical 2026 hook.
   NOT `useOAuth` (web-redirect flow, deprecated for native Apple) and NOT `useSSO` (enterprise SAML
   only). Clerk drives the native ASAuthorization dialog through expo-apple-authentication as a peer
   dep.
5. tRPC Bearer attach: `useAuth().getToken()` → `httpBatchLink` async `headers()` callback →
   `Authorization: Bearer <jwt>`.

## Consequences

### Positive

- Identical auth UX/contract across web + mobile + (eventual) desktop.
- No bespoke token storage — iOS Keychain / Android Keystore via expo-secure-store handled by Clerk.
- Native Apple dialog (no web-view round-trip), better UX + App Store compliance.
- Single server-side verification path via @t/auth — apps/api unaware of which client SDK signed the
  token.

### Negative

- Requires a development build for native Apple Sign-In (Expo Go cannot exercise it). Extra friction
  during local dev.
- Each app maintains its own Clerk client wiring; client SDK upgrades require N coordinated bumps
  (web/mobile/desktop).
- expo-apple-authentication is a hard peer dep; bumping Expo SDK forces a synchronized version of
  this peer.

## Worked Example

```tsx
// apps/mobile/app/_layout.tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <Slot />
    </ClerkProvider>
  );
}

// apps/mobile/app/(auth)/login.tsx
import { useSignInWithApple } from '@clerk/clerk-expo';

export default function Login() {
  const { signInWithApple } = useSignInWithApple();
  return <Button onPress={() => signInWithApple()} title="Sign in with Apple" />;
}
```

## Related

- [001-platform-package-split.md](001-platform-package-split.md) — establishes the
  types/base/browser/native tier convention; this ADR explains why the Clerk client SDK lives in
  each app rather than a shared `@t/clerk-client` browser-tier package.
- packages/auth — the @t/auth port + ClerkAuthProvider server-side wrapper.
- docs/architecture/apps/mobile.md — mobile bootstrap target.
- Commits: 480030f (app.json plugin), ffa78f7 (login.tsx + clerk.ts).
