# Infrastructure map: Railway production

## What this file is for

Concrete deployment topology for this repository on Railway. Use this during incident response, cost
reviews, or when onboarding a new engineer to the production environment.

## When to update it

Update whenever: a service is added or removed, an image version changes, env var references change,
SLOs are set or revised, or the cost owner changes.

---

**Environment:** production
**Platform:** Railway
**Owner:** `<INFRA-TEAM>` — `<ON-CALL>`
**Last updated:** 2026-04-28

---

## Architecture overview

```text
  [ Internet ]
       |
  +----+----+   +----------+   +-----------+
  | apps/web |  | apps/api  |  | apps/website|
  | (Next.js)|  | (Bun HTTP)|  | (Next.js)  |
  +----+----+   +-----+----+   +-----------+
       |               |  \
       |         [Postgres]  [Redis]
       |         pgvector:pg16  bitnami/redis:7.4
       |         (Railway private network)
       |
  External dependencies (outbound from apps/api unless noted):
  +---------+  +------------+  +--------+  +---------+
  |  Clerk  |  | RevenueCat |  | Stripe |  | PostHog |
  | (auth)  |  | (billing)  |  | (web)  |  |(analytics)|
  +---------+  +------------+  +--------+  +---------+
```

Traffic: all public ingress hits Railway's shared load balancer, which routes to each service by
hostname. Apps communicate with Postgres and Redis over Railway's private network only — neither
database is publicly exposed.

---

## Services

| Service | Role | Build | Start command | Health endpoint | Port | Replicas |
| --- | --- | --- | --- | --- | --- | --- |
| `apps/api` | Primary HTTP API | Dockerfile | `bun run dev` | `GET /health` | 3001 | `<TBD>` |
| `apps/web` | Next.js web client | Dockerfile | `bun run start` | `GET /health` | 3001 | `<TBD>` |
| `apps/website` | Marketing / docs site | Dockerfile | `bun run start` | `GET /api/health` | 3002 | `<TBD>` |

Restart policy: `ON_FAILURE` (all services, per `railway.toml`).

### apps/api

- Root: `apps/api/`
- Builder: `DOCKERFILE`
- Start: `bun run dev`
- Health: `GET /health`
- Port: `3001`
- Restart: `ON_FAILURE`
- Env injected: `DATABASE_URL`, `REDIS_URL` (see Env propagation below)

### apps/web

- Root: `apps/web/`
- Builder: `DOCKERFILE`
- Start: `bun run start`
- Health: `GET /health`
- Port: `3001`
- Restart: `ON_FAILURE`

### apps/website

- Root: `apps/website/`
- Builder: `DOCKERFILE`
- Start: `bun run start`
- Health: `GET /api/health`
- Port: `3002`
- Restart: `ON_FAILURE`

### Postgres (pgvector)

- Image: `pgvector/pgvector:pg16`
- Port: `5432` (private network only)
- Volume mount: `/var/lib/postgresql/data` (attach via Railway dashboard > Settings > Volumes)
- pgvector: enabled (baked into image)
- Backup policy: `<TBD>` — Railway does not auto-backup self-hosted services; configure pg_dump cron
  or use a managed add-on

Provisioning (one-time):

```bash
railway add --service postgres
railway environment edit --service-config postgres source.image pgvector/pgvector:pg16
railway variable set POSTGRES_PASSWORD=<secret> POSTGRES_USER=postgres POSTGRES_DB=postgres \
  --service postgres
# Attach volume to /var/lib/postgresql/data via the Railway dashboard
railway variable set DATABASE_URL='postgresql://${{postgres.POSTGRES_USER}}:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{postgres.POSTGRES_DB}}' \
  --service api
```

### Redis

- Image: `bitnami/redis:7.4`
- Port: `6379` (private network only)
- Volume mount: `/bitnami/redis/data` (attach via Railway dashboard > Settings > Volumes)
- Persistence: AOF enabled (`REDIS_AOF_ENABLED=yes`); RDB also written to volume
- Eviction policy: `<TBD>` — set via `REDIS_EXTRA_FLAGS='--maxmemory-policy allkeys-lru'` if needed
- Empty password: disabled (`ALLOW_EMPTY_PASSWORD=no`)

Provisioning (one-time):

```bash
railway add --service redis
railway environment edit --service-config redis source.image bitnami/redis:7.4
railway variable set REDIS_PASSWORD=<secret> ALLOW_EMPTY_PASSWORD=no REDIS_AOF_ENABLED=yes \
  --service redis
# Attach volume to /bitnami/redis/data via the Railway dashboard
railway variable set REDIS_URL='redis://default:${{redis.REDIS_PASSWORD}}@${{redis.RAILWAY_PRIVATE_DOMAIN}}:6379' \
  --service api
```

---

## Env propagation

Railway service-level env vars are scoped to each service. Cross-service references use Railway's
interpolation syntax `${{<service>.<VAR>}}`. Values are resolved at deploy time.

| Variable | Service | Value / source |
| --- | --- | --- |
| `DATABASE_URL` | `api` | `postgresql://${{postgres.POSTGRES_USER}}:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{postgres.POSTGRES_DB}}` |
| `REDIS_URL` | `api` | `redis://default:${{redis.REDIS_PASSWORD}}@${{redis.RAILWAY_PRIVATE_DOMAIN}}:6379` |
| `REDIS_PASSWORD` | `redis` | Sealed Railway variable — never commit the value |
| `POSTGRES_PASSWORD` | `postgres` | Sealed Railway variable — never commit the value |
| `POSTGRES_USER` | `postgres` | `postgres` |
| `POSTGRES_DB` | `postgres` | `postgres` |

All other app-level env vars (Clerk keys, PostHog token, etc.) are set per-service via the Railway
dashboard or `railway variable set`. See each app's `.env.example` for the required surface.

---

## External dependencies

| Vendor | Purpose | Services | Degradation impact | Status page |
| --- | --- | --- | --- | --- |
| Clerk | Authentication / session management | api, web, website | Auth fails; no login possible | <https://status.clerk.com> |
| RevenueCat | Subscription billing (primary) | api | Billing checks fail; entitlements unavailable | <https://status.revenuecat.com> |
| Stripe | Web payment processing (via RevenueCat) | web | Web checkout unavailable | <https://status.stripe.com> |
| PostHog | Product analytics | api, web, website | Analytics loss; no user impact | <https://status.posthog.com> |

---

## SLOs

| Service | Availability target | Latency target | Error budget window |
| --- | --- | --- | --- |
| `apps/api` | `<TBD>` | `<TBD>` | 30 days |
| `apps/web` | `<TBD>` | `<TBD>` | 30 days |
| `apps/website` | `<TBD>` | `<TBD>` | 30 days |

---

## Who to page

| Situation | Primary | Escalation |
| --- | --- | --- |
| Any app service down | `<INFRA>` | `<BACKEND>` |
| Postgres down / unreachable | `<DATA>` | `<INFRA>` |
| Redis down / unreachable | `<INFRA>` | `<BACKEND>` |
| Clerk outage | Check <https://status.clerk.com> — runbook below | `<BACKEND>` after 30 min |
| PostHog outage | Check <https://status.posthog.com> — runbook below | `<INFRA>` after 30 min |
| Security / credentials | `<INFRA>` | Engineering lead |

---

## Cost

| Resource | Monthly estimate | Cost owner | Notes |
| --- | --- | --- | --- |
| Compute (3 services) | `<TBD-monthly>` | `<TEAM>` | Scales with replicas |
| Postgres | `<TBD-monthly>` | `<TEAM>` | Volume storage extra |
| Redis | `<TBD-monthly>` | `<TEAM>` | Volume storage extra |
| **Total** | `<TBD-monthly>` | `<OWNER>` | Review quarterly |

Railway dashboard: <https://railway.app/dashboard> (project-scoped cost view under Settings >
Usage).

---

## Runbooks

- Database down: `/docs/runbooks/database-down.md`
- Railway deploy stuck: `/docs/runbooks/railway-deploy-stuck.md`
- Clerk outage: `/docs/runbooks/clerk-outage.md`
- PostHog data loss: `/docs/runbooks/posthog-loss.md`

---

_Last reviewed: 2026-04-28 — owner: TBD_
