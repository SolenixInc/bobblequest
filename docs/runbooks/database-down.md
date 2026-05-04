# Runbook: database down

## What this file is for

Step-by-step response guide for when the Railway Postgres service (`pgvector/pgvector:pg16`) is
unreachable from any app in the monorepo. Written for an on-call engineer who may be unfamiliar
with this failure mode.

## When to update it

Update this runbook immediately after any incident where it was used. Capture the exact steps
taken, not what you expected to do. Update the Railway UI paths if Railway's dashboard changes.

---

**Trigger:** Postgres service unreachable from any app — every DB-dependent request fails.
**Severity:** P1
**Owner:** `<BACKEND-TEAM>` — `<ON-CALL>`
**Last updated:** 2026-04-28

---

## Trigger

- Healthcheck monitor `api-healthcheck` returns non-200 on `GET /health` for 2+ consecutive
  checks.
- Application logs show `ECONNREFUSED` or `ETIMEDOUT` on every database operation.
- Users report inability to load any authenticated data (auth-only Clerk flows may still work).

Also triggered manually by: on-call engineer observing 100% DB error rate in Railway logs.

## Detect

```bash
# 1. Check the API health endpoint
curl -s https://<API_HOST>/health | jq .
# Healthy:   { "status": "ok", "db": "ok" }
# Unhealthy: { "status": "degraded", "db": "error" } or connection timeout

# 2. Check Railway logs for the api service
railway logs --service api --tail 50
# Unhealthy indicator: repeated "ECONNREFUSED" or "ETIMEDOUT" lines referencing DATABASE_URL

# 3. Run the db ping helper (if provisioned)
# bun run --filter @t/db ping
# <TBD> — confirm this script exists before relying on it; see packages/db/README.md

# 4. Check Railway dashboard
# URL: https://railway.app/project/<PROJECT_ID>
# Postgres service status should show "Running". If "Errored" or "Stopped", proceed to Mitigate.
```

Expected healthy output: `/health` returns `200` with `"db": "ok"`.
Confirmed unhealthy when: `/health` returns `503` or `"db": "error"`, or `ECONNREFUSED` appears
in `api` logs.

## Impact

- **User impact:** All app features requiring database access fail (auth-gated data views, user
  profiles, embeddings search). Users see errors or blank states.
- **Scope:** All users across web, website, mobile, and desktop clients that hit DB-dependent API
  routes.
- **Auth impact:** Clerk SDK token validation is cached client-side and may continue working
  for already-authenticated sessions. New sign-in requiring a DB lookup (e.g., `clerk_user_id`
  sync) will fail.
- **Data risk:** No — a down service does not corrupt data. Volume-persisted data
  (`/var/lib/postgresql/data`) is intact unless the volume itself was detached.
- **Compliance impact:** No — assess separately if PII audit logs are affected.

## Mitigate

Steps are ordered from safest to most disruptive. Do not skip steps.

### Step 1: Confirm scope

Determine whether the issue is the Postgres service specifically, or a broader network/platform
failure.

```bash
# Check Redis health (should still be green if only Postgres is down)
curl -s https://<API_HOST>/health | jq .redis

# Check Railway platform status
# URL: https://railway.app/status  (or status.railway.app)
```

- If Railway platform is down: follow Railway's status page; no local action possible — escalate
  immediately (Step 5).
- If only Postgres is affected: continue to Step 2.

### Step 2: Check Railway service health

1. Open [Railway dashboard](https://railway.app) > your project > `postgres` service.
2. Note the service state: `Running`, `Stopped`, `Errored`, or `Deploying`.
3. Check the service's **Logs** tab for crash reason (OOM, disk full, pg crash, etc.).
4. Check **Settings > Volumes** — confirm the data volume (`/var/lib/postgresql/data`) is still
   attached. A detached volume means data is at risk; do NOT restart until the volume is
   reattached (escalate immediately).

### Step 3: Restart service

> **NOTE:** Restarting drops all active DB connections. In-flight write transactions will be
> rolled back by Postgres on reconnect. This is safe and reversible.

1. Railway dashboard > `postgres` service > **Restart** button.
2. Wait 60 seconds for the service to initialize and accept connections.
3. Re-check the health endpoint:

```bash
curl -s https://<API_HOST>/health | jq .
```

If `"db": "ok"` returns — proceed to Verify recovery. If still failing, continue to Step 4.

### Step 4: Failover (if available)

Railway does not provision Postgres high-availability replicas by default. Unless a read replica
or standby has been explicitly provisioned outside this `railway.toml` configuration, this step
does not apply.

- **No replica provisioned:** skip this step — escalate (Step 5).
- **Replica provisioned:** update `DATABASE_URL` in the `api` service environment to point at
  the replica, then redeploy `api`. Document the failover in the incident channel.

```bash
# Update DATABASE_URL to replica (only if a replica exists)
railway variable set DATABASE_URL='postgresql://<replica-host>/<dbname>' --service api
railway redeploy --service api
```

### Step 5: Escalate if not resolved

If the service has not recovered within 10 minutes of first detection:

1. Page `<ON-CALL-PHONE>` with:
   - Current status (Postgres service state, error text from logs)
   - Steps already taken
   - Whether the data volume is still attached
2. Post in `<#incidents>` Slack channel:

```text
[INCIDENT] Postgres down — <timestamp UTC>
Status: <service state>
Impact: All DB-dependent routes failing
Steps taken: <list>
Owner: <your name>
```

## Rollback

A service restart is inherently reversible (no state is changed). If a config change (e.g.,
`DATABASE_URL` update) made things worse:

```bash
# Revert DATABASE_URL to the original Railway-interpolated value
railway variable set DATABASE_URL='postgresql://${{postgres.POSTGRES_USER}}:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{postgres.POSTGRES_DB}}' --service api

# Redeploy api to pick up the reverted variable
railway redeploy --service api

# Confirm
curl -s https://<API_HOST>/health | jq .
```

Expected result after rollback: `/health` returns `200` with `"db": "ok"`.

## Verify recovery

The incident is resolved when ALL of the following are true:

```text
[ ] /health returns 200 with "db": "ok" for 5 consecutive minutes
[ ] No ECONNREFUSED / ETIMEDOUT in api service logs for 5 minutes
[ ] Manual smoke test passes: authenticate + load one DB-dependent page/endpoint
[ ] Error rate in Railway metrics has returned to pre-incident baseline
[ ] No new alerts firing
[ ] Incident channel updated: resolved at <timestamp UTC>
```

## Postmortem trigger threshold

Open a postmortem in `docs/postmortems/` following `docs/postmortems/00-template.md` if:

- Incident lasted longer than 15 minutes from first alert to recovery.
- Any user-visible data loss or corruption occurred.
- The Postgres data volume was detached at any point during the incident.
- The same incident recurred within 30 days.

## Owner

- **Primary:** `<BACKEND-TEAM>`, on-call rotation defined in `<TBD>`
- **Escalation:** `<ON-CALL-PHONE>` + `<#incidents>` Slack channel
- **Runbook last verified:** 2026-04-28 (verify in staging every 90 days)

---

_Last reviewed: 2026-04-28 — owner: TBD_
