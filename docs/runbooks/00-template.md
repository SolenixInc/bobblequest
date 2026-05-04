# Runbook template

## What this file is for

This is the canonical format for all runbooks in [`docs/runbooks/`](.). Use it when creating a
new runbook. A runbook is a step-by-step guide for responding to a specific, named operational
situation. It is written before incidents, refined during and after them.

## When to update it

Update the template when the team's incident-response process changes. Update individual runbooks
immediately after any incident where the runbook was used — capture what the steps actually were,
not what you thought they'd be.

---

### Why this file exists

Runbooks exist so that any on-call engineer — including one who has never seen this failure mode
before — can resolve the incident without needing to ask another person. A runbook that requires
tribal knowledge to execute has failed its purpose.

Good runbooks are:

- Written for someone paged at 2am who is stressed
- Concrete: exact commands, not vague instructions
- Safe: ordered so that diagnostic steps come before destructive ones
- Honest: if a step can cause data loss, say so explicitly

---

### Worked example

**Scenario:** The `api` healthcheck monitor fires at 03:14 UTC. The on-call engineer opens
`database-down.md`.

1. **Trigger** — monitor `api-healthcheck` shows 503 on `/health` for 3 consecutive checks.
2. **Detect** — engineer runs `curl -s https://api.example.com/health | jq .` and sees
   `"db": "error"` in the response body. Railway dashboard confirms the `postgres` service is in
   state `Errored`.
3. **Impact** — all endpoints that touch the DB return 500. Clerk-only auth flows continue (cached
   JWTs). Estimated 100% of authenticated data flows are down.
4. **Mitigate step 1** — engineer confirms it is the Postgres service, not a network partition,
   by checking that Redis health is green and the `api` container itself is running.
5. **Mitigate step 2** — Railway dashboard > postgres service > Restart. After 60 s the service
   shows `Running`.
6. **Verify** — `/health` returns `200` with `"db": "ok"` for 5 consecutive minutes. Error rate
   drops to zero. Engineer marks incident resolved.
7. **Postmortem** — incident lasted 22 minutes, under the 15-minute threshold, and no data was
   lost, so no postmortem is filed. Runbook is updated with the exact Railway restart path.

---

### Fill-in scaffold

Copy everything below this line into a new file named `<short-name>.md` in `docs/runbooks/`.
Fill in each section. Delete any section that does not apply — do not leave placeholder text in a
production runbook.

---

## Runbook: `<TITLE>`

**Trigger:** `<One sentence>`
**Severity:** P1 / P2 / P3
**Owner:** `<TEAM>` — `<OWNER>`
**Last updated:** YYYY-MM-DD

---

## Trigger

What alert, symptom, or request causes someone to open this runbook?

- Alert name: `<ALERT-NAME>` in `<MONITORING-SYSTEM>`
- Threshold: e.g., error rate > 5% for 5 minutes
- Also triggered by: `<any manual trigger condition>`

## Detect

How do you confirm the issue is real and understand its scope?

```bash
# Check service health
<healthcheck-command>

# Check recent logs
<log-query-command>

# Check metrics dashboard
# URL: <DASHBOARD-URL>
```

Expected healthy output: `<WHAT-HEALTHY-LOOKS-LIKE>`
Confirmed unhealthy when: `<WHAT-UNHEALTHY-LOOKS-LIKE>`

## Impact

Who is affected and how?

- **User impact:** `<describe what users experience>`
- **Scope:** e.g., all users / users in `<region>` / users of `<feature>`
- **Data risk:** yes / no — if yes, describe
- **Compliance impact:** yes / no — if yes, page `<COMPLIANCE-CONTACT>`

## Mitigate

Steps to stop the bleeding. Ordered from safest to most disruptive. Do not skip to a later step
without completing earlier ones.

### Step 1: `<First mitigation action>`

```bash
<command>
```

Expected result: `<what you should see>`

### Step 2: `<Second mitigation action>`

> **WARNING:** This step `<describe any risk>`.

```bash
<command>
```

Expected result: `<what you should see>`

### Step 3: Escalate if not resolved

If mitigation has not reduced the error rate after `<N>` minutes, page `<ESCALATION-CONTACT>`
with:

- Current error rate
- Steps taken so far
- Any anomalies in logs

## Rollback

If mitigation made things worse, or if the fix introduced a regression:

```bash
# Revert the last deploy
<rollback-command>

# Confirm rollback
<healthcheck-command>
```

Expected result after rollback: `<describe expected healthy state>`

## Verify recovery

The incident is resolved when ALL of the following are true:

```text
[ ] Error rate below <THRESHOLD> for at least <DURATION>
[ ] Health check endpoint returns 200
[ ] Key user flow works (manual smoke test): <describe the flow>
[ ] No new alerts firing
[ ] On-call engineer has confirmed with a second pair of eyes
```

## Postmortem trigger threshold

Open a postmortem (see `docs/postmortems/00-template.md`) if:

- Incident lasted longer than `<DURATION>` (e.g., 30 minutes)
- User-visible error rate exceeded `<THRESHOLD>` (e.g., 1% for > 5 min)
- Data loss or corruption occurred
- A compliance-regulated system was affected
- The same incident occurred twice in `<WINDOW>` (e.g., 30 days)

## Owner

- **Primary:** `<OWNER>` (`<TEAM>`)
- **Escalation:** `<ESCALATION-CONTACT>`
- **Runbook last verified:** YYYY-MM-DD (test the runbook in staging at least every 90 days)

---

_Last reviewed: 2026-04-28 — owner: TBD_
