# Postmortem template

## What this file is for

This is the canonical blameless postmortem format for `docs/postmortems/`. Use it for every
incident that meets the filing threshold:

- Any P1 lasting more than 15 minutes
- Any P2 lasting more than 30 minutes
- Any user-visible data loss, regardless of duration or severity

## When to update it

Update this template when the team's postmortem process changes. Existing postmortems are
append-only once published — add an amendment section if a closed postmortem needs revision.

---

### Why this file exists

Postmortems are blameless. They serve learning, not accountability. Incidents recur when their
root causes are not understood. A written, shared postmortem:

- Captures the timeline while memory is fresh
- Surfaces systemic causes that no single person saw in full
- Drives concrete action items with owners and deadlines
- Builds a searchable record so future incidents can be correlated

The blameless principle is not about shielding anyone from consequences — it creates the
psychological safety required for accurate, honest reporting. An engineer who fears blame omits
details. Those omissions prevent the real root cause from surfacing.

Filed for: any P1 > 15 min, P2 > 30 min, OR any user-visible data loss.

---

### Worked example

See [`docs/postmortems/example-2026-04-28-incident.md`](example-2026-04-28-incident.md) for a
complete worked example (fictional — no real outage occurred).

---

### Fill-in scaffold

Copy everything below the next `---` into a new file named
`YYYY-MM-DD-<short-description>.md` in `docs/postmortems/`. Fill in each section within 48 hours
of incident resolution while the timeline is still fresh.

---

## Postmortem: `<INCIDENT-TITLE>`

**Date:** `<YYYY-MM-DD>`
**Severity:** `<P1|P2|P3>`
**Duration:** `<HH:MM>`
**Status:** Draft
**Authors:** `<NAMES>`
**Reviewers:** `<NAMES>`

## Summary

One paragraph, written for someone who was not on-call. What happened, what was the user impact,
and what fixed it?

## Impact

| Dimension | Value |
| --- | --- |
| User-facing impact | `<describe: errors / degraded / none visible>` |
| Affected users | `<count or estimate>` |
| Revenue impact | `<amount or none>` |
| Data loss | `<yes/no — describe if yes>` |
| SLA breach | `<yes/no — describe if yes>` |

## Timeline

All times in UTC. Use exact timestamps from logs, not approximations.

- `HH:MM UTC` — `<first symptom or alert>`
- `HH:MM` — `<on-call paged>`
- `HH:MM` — `<investigation step>`
- `HH:MM` — `<hypothesis formed>`
- `HH:MM` — `<mitigation attempted>`
- `HH:MM` — `<mitigation succeeded / failed>`
- `HH:MM` — `<recovery confirmed>`
- `HH:MM` — `<all-clear communicated to stakeholders>`

## Detection

- How was the incident detected? (alert / user report / engineer noticed / external status page)
- How long after the incident began was it detected? (detection gap)
- Was the alert appropriate, too late, too noisy, or missing entirely?

## Response

- Was a runbook used? Which one?
- Was the runbook accurate and sufficient?
- What decisions were made that were not in the runbook?
- Were the right people paged at the right time?

## Root cause

Use the 5-whys technique. Start with the surface symptom and drill down to a systemic cause.

**Symptom:** `<what users or systems experienced>`

- **Why 1:** `<immediate technical cause>`
- **Why 2:** `<why did that occur>`
- **Why 3:** `<why was that condition present>`
- **Why 4:** `<what process or design allowed this>`
- **Why 5 (root):** `<systemic cause — the one we can fix>`

**Root cause statement:** `<one sentence>`

## What went well

- `<e.g., the monitoring alert fired within 2 minutes>`
- `<e.g., the runbook covered this scenario accurately>`
- `<e.g., the team communicated clearly in the incident channel>`

## What went poorly

- `<e.g., no runbook existed for this failure mode>`
- `<e.g., the alert threshold was too conservative — fired 8 minutes late>`
- `<e.g., staging did not reproduce the failure, so it was not caught pre-deploy>`

## Action items

Each action item must have an owner and a deadline. Unowned items do not get done.

| # | Action | Owner | Due |
| --- | --- | --- | --- |
| 1 | `<specific action>` | `<OWNER>` | YYYY-MM-DD |
| 2 | `<specific action>` | `<OWNER>` | YYYY-MM-DD |

## Lessons

What should the whole team take away? Keep to 2-4 sentences — this is what gets shared in
retrospectives.

`<concise lessons learned>`

---

_Last reviewed: 2026-04-28 — owner: TBD_
