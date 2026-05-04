# Postmortem: example PostHog ingest backlog (fictional)

## What this file is for

This is a worked example of the postmortem format defined in
[`docs/postmortems/00-template.md`](00-template.md). It is written as if a real incident
occurred, so every section is populated with concrete-but-fictional detail.

## When to update it

Do not update this file to reflect real incidents. If the template format changes, update this
example to match. Treat it as living documentation of the format, not as a historical record.

---

**This is a fictional incident used as a worked example. No real outage occurred on this date.**

**Date:** 2026-04-28 (fictional)
**Severity:** P3
**Duration:** 02:15
**Status:** Published — example only
**Authors:** Alex Montoya (fictional)
**Reviewers:** Sam Rivera (fictional)

> **This is a fictional incident** used as a worked example. No real outage occurred.

## Summary

PostHog's ingestion endpoint returned HTTP 503 for 2 hours 15 minutes due to a regional outage
on PostHog's infrastructure. Analytics events from the `web` and `website` apps were buffered
in-memory by the PostHog JS SDK and dropped silently when users closed browser tabs. No user-
facing features were degraded; the sole impact was loss of approximately 12,000 analytics events.

## Impact

| Dimension | Value |
| --- | --- |
| User-facing impact | None — product features unaffected |
| Affected users | 0 (no errors surfaced to users) |
| Revenue impact | None |
| Data loss | Yes — approximately 12,000 analytics events dropped on tab close |
| SLA breach | No |

## Timeline

- `14:02 UTC` — PostHog status page shows all systems green
- `14:07 UTC` — alert fires: PostHog 5xx error rate > 5% sustained for 60 seconds
- `14:08 UTC` — on-call acknowledges page via PagerDuty
- `14:09 UTC` — engineer confirms via PostHog status page: regional ingestion outage, not our
  credentials or config
- `14:15 UTC` — engineer follows `docs/runbooks/posthog-loss.md` Step 1 (verify credentials,
  confirm upstream status, do not rotate keys)
- `14:20 UTC` — incident channel opened; stakeholders notified; no escalation required
- `16:17 UTC` — PostHog status page returns to green; 5xx rate drops to zero
- `16:30 UTC` — incident closed; all-clear posted in incident channel

## Detection

- Detected via automated alert: PostHog 5xx response rate exceeded 5% threshold for 60 seconds.
- Detection gap: approximately 5 minutes from outage onset to alert fire (PostHog's own status
  page did not update until after our alert fired).
- Alert was appropriate and timely. No tuning required.

## Response

- Runbook `docs/runbooks/posthog-loss.md` was followed verbatim.
- Runbook was accurate: it correctly identified "do not rotate credentials on upstream outage" as
  Step 1, preventing unnecessary key churn.
- No out-of-runbook decisions were required.
- On-call was paged via PagerDuty within 1 minute of alert; no escalation was needed.

## Root cause

**Symptom:** PostHog ingestion endpoint returning 503; analytics events not being recorded.

- **Why 1:** PostHog's regional ingestion cluster was unavailable.
- **Why 2:** PostHog experienced an infrastructure-level failure in the us-east region.
- **Why 3:** This is an upstream dependency failure outside our control.
- **Why 4:** Our analytics-browser package delegates buffering entirely to the PostHog JS SDK,
  which buffers in-memory with no persistence layer.
- **Why 5 (root):** We have no retry-after-recovery mechanism for events buffered during an
  upstream outage — events are lost when the browser tab closes.

**Root cause statement:** Upstream PostHog regional outage exposed a gap in our client-side
analytics resilience: in-memory buffering with no persistence means events are irrecoverably lost
on tab close during any outage window.

## What went well

- Runbook applied verbatim — no improvisation required
- No user-facing impact; product features were completely unaffected
- On-call acknowledged and diagnosed within 7 minutes of incident onset
- Correct decision made immediately: do not rotate credentials on upstream outage
- Stakeholders notified within 13 minutes via incident channel

## What went poorly

- Client-side event buffer (PostHog JS SDK in-memory queue) dropped approximately 12,000 events
  on tab close — no persistence layer exists to survive a browser session ending mid-outage
- No retry-after-recovery mechanism: events that failed during the outage window were not
  replayed once PostHog came back online
- PostHog status page lagged our own alert by approximately 5 minutes, making initial triage
  slightly slower than it could have been

## Action items

| # | Action | Owner | Due |
| --- | --- | --- | --- |
| 1 | Add IndexedDB-backed retry buffer in `packages/analytics-browser` to survive tab close during outage | `<TBD>` | 2026-05-15 |
| 2 | Add PostHog status page polling to `/health` endpoint so health checks surface upstream degradation | `<TBD>` | 2026-05-08 |

## Lessons

The NoOp analytics tracker is the documented fallback for the *configured-off* state (feature
flag disabled, no API key). Transient upstream outages are a distinct failure mode: the SDK is
initialized and receiving events, but ingestion is unavailable. These two failure modes warrant
separate resilience strategies. An IndexedDB-backed retry buffer addresses transient outages
without changing the NoOp contract for the intentionally-disabled case.

---

Last reviewed: 2026-04-28 — owner: TBD