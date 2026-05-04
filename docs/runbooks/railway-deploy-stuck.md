# Runbook: Railway Deploy Stuck

## What this file is for

Step-by-step response guide for on-call engineers when a Railway service deploy is stuck in
"Building", "Deploying", or "Restarting" for more than 10 minutes, preventing new code from
reaching users.

## When to update it

Update when: Railway CLI commands change, health-check paths change (currently `/health` for
`api`/`web`, `/api/health` for `website`), services are added or renamed in `railway.toml`,
or a postmortem produces a new mitigation step.

**Trigger:** A Railway service is stuck in Building, Deploying, or Restarting for more than
10 minutes.
**Severity:** P2
**Owner:** INFRA — ON-CALL
**Last updated:** 2026-04-28

---

## Trigger

- Railway dashboard shows a service (`api`, `web`, or `website`) stuck in "Building",
  "Deploying", or "Restarting" for more than 10 minutes with no progress in build logs.
- `railway status` CLI output shows the deploy has not advanced.
- A commit was pushed to `main` and the expected new version is not serving after 10 minutes.

## Detect

1. Open the Railway dashboard -> select the project -> Deployments tab for the affected
   service.
2. Check build logs for the stuck deploy — look for a hung build step, frozen log tail, or
   OOM signals.
3. Run `railway status` (Railway CLI) to confirm current deploy state.
4. Confirm the previous deploy is still serving by hitting the health-check endpoint:
   - `api`: `GET /health` -> expect 200
   - `web`: `GET /health` -> expect 200
   - `website`: `GET /api/health` -> expect 200

## Impact

- New code is **not** deployed; the previous version continues serving traffic.
- User-facing impact is limited to release delay — existing functionality is unaffected unless
  the previous version has a known bug that the stuck deploy was meant to fix.
- If the service is stuck in "Restarting" (crash loop), user-facing traffic may be intermittent.

## Mitigate

### Step 1: Cancel the stuck deploy

In the Railway dashboard:

- Navigate to the affected service -> Deployments -> locate the stuck deploy -> click "Cancel".
- Wait for the cancel to complete (usually < 60 seconds).
- Confirm the previous deploy is still active and healthy via the health-check endpoint.

### Step 2: Redeploy from latest commit or roll back

Option A — Redeploy latest: Railway dashboard -> Deployments -> "Deploy" button, or run:

```sh
railway up --service <service-name>
```

Option B — Roll back to last known good: Railway dashboard -> Deployments -> locate the last
successful deploy -> "Redeploy". Document the rolled-back commit SHA in `<#incidents>`.

Services and their `railway.toml` roots:

- `api` -> `apps/api/` (port 3001, start: `bun run dev`)
- `web` -> `apps/web/` (port 3001, start: `bun run start`)
- `website` -> `apps/website/` (port 3002, start: `bun run start`)

### Step 3: Escalate if not resolved

If the rebuild also stalls:

- Open a Railway support ticket via the dashboard "Help" button — include the project ID,
  service name, and stuck deploy ID.
- Post in `<#incidents>` Slack channel with the service name, stuck deploy ID, and current
  impact assessment.
- If a rollback is performed, notify `<BACKEND-TEAM>` lead so the rolled-back commit is
  investigated before the next deploy attempt.

## Rollback

Railway dashboard -> Deployments -> select the previous known-good deploy -> "Redeploy".

After rollback:

1. Confirm health-check returns 200 for the affected service.
2. Note the rolled-back commit SHA and the reason in `docs/postmortems/` as a stub entry.
3. Investigate the root cause (build step, memory limit, Dockerfile regression, env var
   missing) before re-attempting the deploy.

## Verify recovery

1. Railway deploy completes and shows "Active" status within 5 minutes of the redeploy.
2. Health-check endpoint returns 200:
   - `api` -> `GET <API_URL>/health`
   - `web` -> `GET <WEB_URL>/health`
   - `website` -> `GET <WEBSITE_URL>/api/health`
3. Smoke test the critical user path for the affected service (sign-in, page load, API call).
4. Confirm no error spike in Railway logs after the new deploy goes live.

## Postmortem trigger threshold

File a postmortem when:

- Any deploy outage exceeds 30 minutes.
- A rollback was required (rollback = severity escalation regardless of duration).
- A crash-loop ("Restarting") caused intermittent user-facing errors.

## Owner

INFRA — ON-CALL. Escalation path: infra lead -> Railway support.

---

_Last reviewed: 2026-04-28 — owner: TBD_
