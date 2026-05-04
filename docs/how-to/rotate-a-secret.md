# How to rotate a secret

## What this file is for

Checklists for safely rotating credentials for every external service this project
integrates. Follow the common pattern at the top, then jump to the provider-specific
section. Always end by logging the rotation to the audit log.

## When to update it

When a new provider is added, when a provider's dashboard URL or secret naming convention
changes, or when the rotation process gains new steps (e.g., a new environment is added
to Railway).

**Audience:** anyone responsible for a credential (developer, lead, on-call engineer)

**Prerequisites:** access to the provider's dashboard + access to Railway project variables
and GitHub repository Secrets

**Outcome:** old secret revoked, new secret issued, all environments updated, rotation
logged in `docs/compliance/AUDIT-LOG.md`

---

### Common pattern

Every provider rotation follows the same five-step sequence:

1. Issue the new secret in the provider's dashboard (do NOT revoke the old one yet).
2. Update the secret in Railway (per-environment: production, staging) and in GitHub
   repository Secrets (used by CI/CD).
3. Trigger a redeploy in Railway and confirm the app starts cleanly.
4. Smoke-test that the new secret works (see Verification below).
5. Revoke the old secret in the provider's dashboard.
6. Append a row to `docs/compliance/AUDIT-LOG.md` (see Audit below).

Never revoke before deploying. The overlap window (both secrets valid) keeps the service
online during the cutover.

---

### Per-provider checklists

#### Clerk

Rotates `CLERK_SECRET_KEY` and (if applicable) `CLERK_PUBLISHABLE_KEY`.

1. Go to `<TBD-provider-dashboard-url>` → API Keys.
2. Click "Roll secret key" to generate a new `CLERK_SECRET_KEY`.
3. Update `CLERK_SECRET_KEY` in Railway (Settings → Variables) for every environment.
4. Update `CLERK_SECRET_KEY` in GitHub → Settings → Secrets and variables → Actions.
5. Redeploy and verify (see Verification).
6. Once the new key is confirmed working, revoke the old key from the Clerk dashboard.

#### RevenueCat

Rotates `REVENUECAT_PUBLIC_SDK_KEY` and any server-side secret keys.

1. Go to `<TBD-provider-dashboard-url>` → API Keys.
2. Click "Regenerate" next to the key you are rotating.
3. Update all `REVENUECAT_*` env vars in Railway for every environment.
4. Update the same vars in GitHub Secrets.
5. Redeploy and verify (see Verification).
6. Delete the old key from the RevenueCat dashboard.

Note: RevenueCat is the primary billing interface for mobile and desktop. Stripe is only
used behind RevenueCat for web checkout — do not bypass RevenueCat billing in mobile/desktop.

#### Stripe (web checkout only)

Rotates `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Stripe fronts web checkout only;
RevenueCat fronts all app billing.

1. Go to `<TBD-provider-dashboard-url>` → Developers → API Keys.
2. Click "Roll key" next to the restricted key used by this project.
3. Update `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET` if rotating the webhook endpoint
   secret) in Railway for every environment.
4. Update the same vars in GitHub Secrets.
5. Redeploy and verify (see Verification).
6. Revoke the old Stripe key.

#### PostHog

Rotates `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_PROJECT_API_KEY`, and any personal API tokens
used in CI.

1. Go to `<TBD-provider-dashboard-url>` → Project Settings → API Keys.
2. Click "Rotate" or generate a new key.
3. Update all `*POSTHOG*` env vars in Railway across every environment (api, web, website).
4. Update the same vars in GitHub Secrets.
5. Redeploy all affected services and verify (see Verification).
6. Delete the old PostHog key.

Note: PostHog keys are referenced in multiple packages (`packages/analytics-browser`,
`packages/analytics`) — confirm all consumers are picking up the rotated value.

#### Postgres / Drizzle DB credentials

Rotates `DATABASE_URL` (and constituent `DB_USER` / `DB_PASSWORD` if split out).

1. Go to Railway → your Postgres service → Variables.
2. Update the database password (Railway can generate one, or use a password manager).
3. Copy the new `DATABASE_URL` value.
4. Update `DATABASE_URL` in every Railway service that connects to the database.
5. Update `DATABASE_URL` in GitHub Secrets if it is used in CI migration runs.
6. Trigger a redeploy and verify migrations still pass.
7. Confirm the old password is no longer valid by attempting a connection with it.

#### Railway service token

Rotates `RAILWAY_TOKEN` used by CI to trigger deploys.

1. Go to `<TBD-provider-dashboard-url>` → Account Settings → Tokens.
2. Click "Create token" to generate a new service token.
3. Update `RAILWAY_TOKEN` in GitHub → Settings → Secrets and variables → Actions.
4. Trigger a CI run (e.g., push a trivial commit) to confirm the new token works.
5. Click "Revoke" on the old token in the Railway dashboard.

#### GitHub Actions secrets

For any other secret stored only in GitHub Actions (not Railway):

1. Go to GitHub → repository → Settings → Secrets and variables → Actions.
2. Click the secret name → "Update".
3. Paste the new value. GitHub does not show the old value, so generate the new one in the
   provider's dashboard first.
4. Re-run a workflow that uses the secret to confirm it resolves correctly.
5. Revoke the old credential in its source system.

---

### Verification

After deploying the new secret, run two smoke tests:

1. **New secret works:** trigger a request or action that exercises the rotated credential
   (e.g., a login for Clerk, a test event for PostHog, a test payment for Stripe in
   test mode). Confirm a 200-level response and no auth errors in Railway logs.

2. **Old secret rejected:** if the provider supports it, attempt a request with the old
   credential (e.g., via `curl` with the old key in the header) and confirm a 401 or
   equivalent rejection. This verifies the revocation landed.

---

### Audit

After every rotation append a row to
[docs/compliance/AUDIT-LOG.md](../compliance/AUDIT-LOG.md):

```text
| 2026-04-28 | Clerk | CLERK_SECRET_KEY | Jane D. | Scheduled quarterly rotation |
```

Columns: `date | provider | secret name | who rotated | reason`.

---

### See also

- [/SECURITY.md](../../SECURITY.md)
- [/docs/secrets.md](../secrets.md)
- [/docs/compliance/README.md](../compliance/README.md)

---

_Last reviewed: 2026-04-28 — owner: TBD_
