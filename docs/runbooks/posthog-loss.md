# Runbook: PostHog Analytics Loss

## What this file is for

Step-by-step response guide for on-call engineers when PostHog event ingestion is failing or
our PostHog API keys are rejected, causing analytics events to be silently dropped across
browser, mobile, and server-side trackers.

## When to update it

Update when: PostHog SDK versions change, key-rotation runbook path changes, Slack channel
names change, or `POSTHOG_ENABLED` feature-flag wiring is implemented and the NoOp fallback
path becomes automated.

**Trigger:** PostHog ingestion endpoint is returning 5xx or our API keys are rejected (4xx).
**Severity:** P3
**Owner:** DATA-TEAM — ON-CALL
**Last updated:** 2026-04-28

---

## Trigger

- PostHog status page (`https://status.posthog.com`) shows an active incident.
- Spike in 4xx or 5xx responses from calls originating in `packages/analytics-browser`,
  `packages/analytics-rn`, or `packages/analytics`.
- PostHog dashboards show a drop in event volume that does not match product traffic patterns.

## Detect

1. Open `https://status.posthog.com` — check whether ingestion is degraded globally.
2. Search `apps/api` and `apps/web` logs for PostHog HTTP errors
   (`POSTHOG_HOST`, `app.posthog.com`).
3. Verify event volume in the PostHog dashboard against expected baseline.
4. If errors are 4xx (not 5xx), the key is likely rejected — proceed to Mitigate Step 2
   immediately.

## Impact

- Analytics events are **silently dropped** during the outage window; they are unrecoverable.
- **No user-facing impact.** The NoOp tracker (`NoOpAnalyticsTracker`) is the documented
  fallback when `POSTHOG_ENABLED=false`, but during a live outage the real tracker is still
  active — it simply fails silently. Users experience no errors.
- Product metrics dashboards go blind for the duration.
- RevenueCat-related revenue events and LLM usage events (tracked via `.captureRevenue()` /
  `.captureLlm()`) are lost — these carry elevated severity when missing.

## Mitigate

### Step 1: Confirm via PostHog status page

If `https://status.posthog.com` shows degraded ingestion, the fix is to wait. Post in
`<#data>` Slack channel with the incident link and expected resolution time. No code change
is needed for an upstream ingestion outage.

### Step 2: Rotate PostHog API key if keys are rejected

If errors are 4xx (Unauthorized / Invalid API key):

1. Follow `docs/how-to/rotate-a-secret.md` for the PostHog key rotation procedure.
2. Update `POSTHOG_API_KEY` (server) and `NEXT_PUBLIC_POSTHOG_API_KEY` (browser) in Railway
   variable settings for the affected services (`api`, `web`, `website`).
3. Redeploy affected services via Railway dashboard to pick up new keys.

### Step 3: Escalate if not resolved

- Post acknowledgement in `<#data>` Slack channel.
- If outage spans more than 24 hours, post a user-facing acknowledgement only if revenue or
  billing-related events are affected — standard product analytics loss does not warrant
  public communication.
- Contact PostHog support via `https://app.posthog.com/support` if the status page shows no
  incident but ingestion is still failing.

## Rollback

Not applicable — events lost during the outage window are unrecoverable. No local rollback
restores dropped events. Rollback of a local code change is only warranted if a recent deploy
coincided with the first errors and the PostHog status page shows healthy.

## Verify recovery

1. PostHog status page shows all systems operational.
2. New events appear in the PostHog dashboard within the normal ingestion lag window
   (typically < 60 seconds for browser events).
3. Confirm `.capture()`, `.captureRevenue()`, and `.captureException()` calls are no longer
   producing HTTP errors in logs.

## Postmortem trigger threshold

File a postmortem when:

- Outage exceeds 24 hours.
- RevenueCat-related revenue events or LLM usage events were lost (higher-severity data).
- A key-rotation incident was caused by a secret expiry that was not tracked.

## Owner

DATA-TEAM — ON-CALL. Escalation path: data lead -> PostHog support.

---

_Last reviewed: 2026-04-28 — owner: TBD_
