# Secret management

## What this file is for

This file describes where secrets live, how to add or rotate them, and what to do when one is
compromised. It does not contain actual secret values — ever. If you see a real credential in
this file, treat it as a leak and follow [Compromised-secret response](#compromised-secret-response)
immediately.

## When to update it

Update this file when: a new secret type is introduced, a rotation procedure changes, a new
deployment environment is added, or the audit/scan tooling changes. A wrong rotation procedure
during an incident is a second incident.

---

## Where secrets live

| Scope | Source of truth |
| --- | --- |
| Local dev | `.env` files per app (gitignored; copy from `.env.example`) |
| CI | GitHub Actions repository / environment secrets |
| Production | Railway environment variables, per service |
| User-side keys | Never committed; rotated per provider docs |

`.env.example` files in each app contain placeholder values for every required variable.
They are the canonical list of vars a new developer must populate before running locally.

---

## What never gets committed

The following must never appear in any committed file, PR description, issue comment,
log output, or Slack message:

- `.env` files (any variant)
- `*.pem`, `*.p12`, `*.key` certificate and key files
- OAuth client secrets
- PostHog API keys (`POSTHOG_API_KEY`, `POSTHOG_PERSONAL_API_KEY`)
- Clerk secret keys (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`)
- Database URLs with embedded credentials (`DATABASE_URL`)
- Railway tokens (`RAILWAY_TOKEN`)
- RevenueCat secret keys
- OpenRouter API keys
- Resend API keys

The pre-commit `secret-scan` hook runs `gitleaks protect --staged --redact --verbose` on
every commit. If gitleaks is not installed locally the scan is skipped with a warning; CI
runs a full scan and will block the merge.

---

## Adding a new secret

1. Define the schema entry in `packages/config/entities/schemas/<AppOrContext>ConfigSchema.ts`
   using a Zod string validator. The config module throws at boot for missing required vars —
   no silent fallbacks.
2. Add the variable to the relevant `.env.example` with an `<ANGLE-BRACKET>` placeholder and
   a one-line comment describing the value source (e.g., `# From PostHog project settings`).
3. Add the variable to the Railway service environment in the Railway dashboard.
4. Add the variable to the GitHub Actions environment secrets if CI needs it.
5. Document the variable in `docs/reference/env-vars.md`.
6. Never commit a real value — only the placeholder in `.env.example`.

---

## Rotating a secret

Follow the per-provider checklist in `docs/how-to/rotate-a-secret.md` _(to be added)_.
General steps:

1. Generate the new value in the provider's console.
2. Write the new value to Railway (and GitHub Actions if CI uses it) — do not delete the
   old value yet.
3. Deploy the affected service; confirm it is healthy with the new secret.
4. Revoke the old value in the provider's console.
5. Notify the team that rotation is complete.

---

## Compromised-secret response

A secret is compromised if it appears in a commit (even a reverted one), a log, a PR
description, an issue comment, or any system outside the approved scopes above.

Immediate response (within 15 minutes):

1. Rotate the secret using the procedure above — do this first, before anything else.
2. Revoke the old credential at the source (provider console, Railway, GitHub).
3. Notify the team.

Refer to `SECURITY.md` at the repo root for the full incident response procedure, including
access-log audit, PHI/PII notification requirements, and postmortem filing obligations.

---

## Audit

The pre-commit secret-scan command is:

```bash
gitleaks protect --staged --redact --verbose
```

Configured in `lefthook.yml` under `pre-commit.commands.secret-scan`. If `gitleaks` is not
installed locally the check is advisory only; CI runs a full scan on every push and blocks
merges on findings.

To run a full repo scan manually:

```bash
gitleaks detect --source . --redact --verbose
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
