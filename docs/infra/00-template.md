# Infrastructure map template

## What this file is for

This is the canonical format for infrastructure maps in `docs/infra/`. Use it when documenting a new
environment, a new deployment platform, or a significant infrastructure component. An infra map
gives
any engineer (or on-call responder) a fast, accurate picture of what runs where, what it depends on,
and who owns it.

## When to update it

Update infra maps whenever: a new service is added or removed, a dependency changes, an SLO is
updated, the cost owner changes, or a region/environment configuration changes. Stale infra maps
mislead incident responders — they are worse than no map.

---

### Why this file exists

When something breaks at 2am, the on-call engineer needs to answer four questions in under two
minutes:

1. What is this service and what does it do?
2. What does it depend on?
3. Who do I page?
4. What is its SLO — how bad is it right now?

A good infra map answers all four without requiring tribal knowledge or console access.

---

### Worked example

Below is a short worked map for a fictional small service (`notify`) deployed on Railway.

```text
Infrastructure map: notify (production)

Environment: production
Platform:    Railway
Owner:       Platform team — @platform-oncall
Last updated: 2026-01-15

Architecture overview
---------------------

  [ Internet / CDN ]
         |
  +------+------+
  |  notify-web |   (Next.js SSR, Railway service)
  +------+------+
         | REST
  +------+------+
  |  notify-api |   (Bun HTTP, Railway service)
  +------+------+
     |        |
  [Postgres]  [Redis]    (Railway private network)
              |
         [ Resend ]      (external: email delivery)

Services
--------
| Service      | Role           | Replicas | Region    | Health endpoint |
| --- | --- | --- | --- | --- |
| notify-api   | HTTP API       | 1        | us-west1  | GET /health     |
| notify-web   | SSR frontend   | 1        | us-west1  | GET /           |

Databases and queues
--------------------
| Name            | Type       | Version | Backups           |
| --- | --- | --- | --- |
| notify-db       | PostgreSQL | 16      | Daily snapshot    |
| notify-cache    | Redis      | 7.4     | AOF persistence   |

External dependencies
---------------------
| Vendor  | Purpose       | Degradation impact         | Status page                   |
| --- | --- | --- | --- |
| Resend  | Email delivery | Emails queue; no data loss | https://status.resend.com     |

SLOs
----
| Service    | Availability | Latency target | Error budget window |
| --- | --- | --- | --- |
| notify-api | 99.9%        | p95 < 300 ms   | 30 days             |
| notify-web | 99.5%        | p95 < 1 s      | 30 days             |

Who to page
-----------
| Situation          | Primary         | Escalation            |
| --- | --- | --- |
| Any service down   | @platform-oncall | Engineering lead    |
| Database down      | @platform-oncall | Engineering lead    |
| Vendor down        | Check status page first | @platform-oncall after 30 min |
| Security           | @security       | Engineering lead     |

Cost
----
| Resource  | Monthly estimate | Notes              |
| --- | --- | --- |
| Compute   | $20              | Scales with traffic |
| Database  | $10              | Fixed-size          |
| Total     | $30              | Review quarterly   |

Runbooks
--------
- Database down: docs/runbooks/database-down.md
```

---

### Fill-in scaffold

Copy everything below this line into a new file named `<environment-or-platform>.md` in
`docs/infra/`.
Fill in each section. The ASCII diagram under "Architecture overview" is required — a missing
diagram
is a missing map.

---

## Infrastructure map: `<NAME>`

**Environment:** production / staging / development
**Platform:** `<PLATFORM>`
**Owner:** `<TEAM>` — `<OWNER>`
**Last updated:** YYYY-MM-DD

---

## Architecture overview

```text
[Replace with an ASCII diagram using box-drawing characters. Show:]
  - Each service (labelled box)
  - Databases and queues (labelled differently from services)
  - External dependencies (third-party APIs, CDNs)
  - Traffic flow direction (arrows: | \ / --)
  - Environment boundary

Example shape:

  [ Internet ]
       |
  [ Load Balancer ]
       |
  +---------+     +---------+
  |  <web>  |     |  <api>  |
  +---------+     +---------+
       |               |    \
  [ Cache ]       [ DB ]   [ Queue ]
                            |
                        [ Worker ]
```

---

## Services

| Service | Role | Replicas | Region | Health endpoint |
| --- | --- | --- | --- | --- |
| `<product>-api` | Primary HTTP API | `<N>` | `<REGION>` | `GET /health` |
| `<product>-web` | Frontend / SSR | `<N>` | `<REGION>` | `GET /` |
| `<product>-worker` | Background job processor | `<N>` | `<REGION>` | N/A — check queue depth |

## Databases and queues

| Name | Type | Version | Environment | Backups |
| --- | --- | --- | --- | --- |
| `<product>-db` | PostgreSQL | `<VERSION>` | prod | Daily — see `<BACKUP-POLICY-URL>` |
| `<product>-cache` | Redis | `<VERSION>` | prod | No persistence (cache only) |
| `<product>-queue` | `<QUEUE-SYSTEM>` | `<VERSION>` | prod | At-least-once delivery |

## External dependencies

| Vendor | Purpose | Degradation impact | Status page |
| --- | --- | --- | --- |
| `<VENDOR-1>` | `<PURPOSE>` | `<IMPACT-IF-DOWN>` | `<STATUS-URL>` |
| `<VENDOR-2>` | `<PURPOSE>` | `<IMPACT-IF-DOWN>` | `<STATUS-URL>` |

## SLOs

| Service | Availability target | Latency target | Error budget window |
| --- | --- | --- | --- |
| `<product>-api` | 99.9% | p95 < 300 ms | 30 days |
| `<product>-web` | 99.5% | p95 < 1000 ms | 30 days |

## Who to page

| Situation | Primary | Escalation |
| --- | --- | --- |
| Any service down | `<OWNER>` | `<ESCALATION-CONTACT>` |
| Database down | `<OWNER>` | `<ESCALATION-CONTACT>` |
| Third-party vendor down | Check vendor status page first | `<OWNER>` if > 30 min |
| Security / credentials | `<SECURITY-CONTACT>` | `<OWNER>` |

## Cost

| Resource | Monthly estimate | Cost owner | Notes |
| --- | --- | --- | --- |
| Compute | `<$AMOUNT>` | `<TEAM>` | Scales with traffic |
| Database | `<$AMOUNT>` | `<TEAM>` | Fixed-size instance |
| Bandwidth | `<$AMOUNT>` | `<TEAM>` | Variable |
| **Total** | `<$AMOUNT>` | `<OWNER>` | Review quarterly |

Alerts: if monthly spend exceeds `<$THRESHOLD>`, page `<COST-OWNER>`.

## Runbooks

Operational runbooks for this environment:

- Database down: `docs/runbooks/database-down.md`
- High error rate: `docs/runbooks/<high-error-rate>.md`
- `<Add more as they exist>`

---

_Last reviewed: 2026-04-28 — owner: TBD_
