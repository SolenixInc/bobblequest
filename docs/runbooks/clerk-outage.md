# Runbook: Clerk Outage

## What this file is for

Step-by-step response guide for on-call engineers when the Clerk identity API is unreachable
or returning 5xx errors, causing new sign-ins to fail across web, mobile, and desktop clients.

## When to update it

Update when: Clerk SDK version changes, feature-flag infrastructure is wired up, Slack channel
names change, or a postmortem produces a new mitigation step.

**Trigger:** Clerk identity API is unreachable or returning 5xx responses.
**Severity:** P1
**Owner:** BACKEND-TEAM — ON-CALL
**Last updated:** 2026-04-28

---

## Trigger

- 5xx rate on Clerk SDK calls rises above baseline in `apps/api` or `apps/web` logs.
- New sign-in attempts return error responses on web, mobile, or desktop.
- Clerk status page (`https://status.clerk.com`) shows an active incident.

## Detect

1. Check `apps/api` server logs for `ClerkAPIError` or 5xx responses on auth middleware paths.
2. Check `apps/web` client logs for failed `@clerk/nextjs` calls.
3. Open `https://status.clerk.com` — confirm whether the outage is global or regional.
4. Check Railway dashboard: confirm `apps/api` and `apps/web` are healthy (deploy not stuck);
   rule out a local regression before treating as upstream.

## Impact

- New sign-ins fail across all clients (web, mobile, desktop).
- Existing sessions continue working until their JWT expiry window closes — degraded, not down.
- Password reset, email verification, and OAuth flows are fully blocked.
- No user data is at risk; this is an availability failure, not a security failure.

## Mitigate

### Step 1: Confirm the outage is upstream

Cross-reference `https://status.clerk.com` with Railway log timestamps. If Clerk shows
operational and logs show errors, the fault may be local — check env vars
(`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) before treating as an outage.

### Step 2: Enable maintenance mode (if available)

Enable a maintenance banner in `apps/web` and `apps/website` via `<TBD-feature-flag>` once
feature-flag infrastructure is wired. Until then, post a manual status message in
`<#status>` Slack channel so users are informed.

### Step 3: Escalate if not resolved

There is no auth failover for the primary Clerk provider. If the outage exceeds 30 minutes:

- Post a user-facing status update in `<#status>`.
- Notify `<BACKEND-TEAM>` lead via direct message.
- Open a Clerk support ticket at `https://dashboard.clerk.com` if the incident is not
  acknowledged on the status page.

## Rollback

Not applicable — this is an upstream provider outage. No local rollback resolves it.
If a local code change coincided with the first error, revert that change via Railway dashboard
(Deploys -> previous known good -> Redeploy) to rule it out before escalating.

## Verify recovery

1. Clerk status page shows all systems operational.
2. 100 consecutive successful auth requests in `apps/api` logs with no Clerk 5xx.
3. Manual smoke test: complete a full sign-in flow on `apps/web` and confirm session is
   established.
4. Remove maintenance banner / status message.

## Postmortem trigger threshold

File a postmortem when:

- Any P1 auth outage exceeds 15 minutes.
- The outage produces measurable revenue impact (blocked sign-ups, failed billing flows).
- A local misconfiguration (wrong env var) was misdiagnosed as an upstream outage.

## Owner

BACKEND-TEAM — ON-CALL. Escalation path: team lead -> Clerk support.

---

_Last reviewed: 2026-04-28 — owner: TBD_
