# Documentation hub

Welcome to `template-repo`. This index is the single entry point for all documentation.
Every document is organized by its **purpose** using the [Diátaxis framework](https://diataxis.fr/),
so you always know where to look — and where to write.

---

## What this file is for

This landing page maps the four Diátaxis quadrants to their home directories, provides a
decision tree for where a new document belongs, and links to every operational and architectural
area of the docs.

## When to update it

- A new top-level area is added to `docs/`
- A quadrant index or template is replaced or moved
- The team adopts a new tool whose docs live outside the four quadrants (add a link below)

---

## Choose your quadrant

Diátaxis asks: *is the reader **learning**, **doing**, **understanding**, or **looking something
up**?*

```text
┌───────────────────────────────┬───────────────────────────────┐
│        TUTORIALS              │         HOW-TO GUIDES         │
│  Learning-oriented            │  Task-oriented                │
│  The reader is a beginner.    │  The reader knows what they   │
│  Walk them through a real     │  want to accomplish. Give     │
│  journey, step by step.       │  them the steps — no more.    │
│                               │                               │
│  docs/tutorials/              │  docs/how-to/                 │
└───────────────────────────────┼───────────────────────────────┤
│        REFERENCE              │        EXPLANATION            │
│  Information-oriented         │  Understanding-oriented       │
│  Accurate, complete,          │  The "why" of the system.     │
│  structured. Ideally          │  Discuss tradeoffs, context,  │
│  auto-generated.              │  and design decisions.        │
│                               │                               │
│  docs/reference/              │  docs/explanation/            │
└───────────────────────────────┴───────────────────────────────┘
```

| I want to... | Read |
| --- | --- |
| learn by doing | `tutorials/` |
| accomplish a specific task | `how-to/` |
| look up exact details | `reference/` |
| understand why | `explanation/` |

If a document serves two purposes (e.g., teaches AND lists facts), split it into two files —
one per quadrant — and cross-link them.

### Tutorials — learning-oriented

Step-by-step walkthroughs for someone encountering the system for the first time. The reader
learns by doing a real task, not by reading a spec.

- Index: [docs/tutorials/index.md](tutorials/index.md)
- Example: [Getting started](tutorials/getting-started.md)

### How-to guides — task-oriented

Concise, goal-oriented instructions for a reader who already knows the system and needs to
accomplish a specific thing. No background theory — just the steps.

- Index: [docs/how-to/index.md](how-to/index.md)
- Example: [Rotate a secret](how-to/rotate-a-secret.md)

### Reference — information-oriented

Accurate, structured facts. Configuration schemas, API signatures, env-var tables, CLI flags.
Ideally generated from source where possible.

- Index: [docs/reference/index.md](reference/index.md)
- Example: [Env vars reference](reference/env-vars.md)

### Explanation — understanding-oriented

The "why" behind design decisions: tradeoffs, context, history, alternatives rejected. This
quadrant is for building mental models, not for completing tasks.

- Index: [docs/explanation/index.md](explanation/index.md)
- Example: [Architecture overview](explanation/architecture-overview.md)

---

## Operations

Operational docs live outside the four quadrants because they serve a different lifecycle
(on-call, incidents, releases) rather than a reader's learning or reference need.

### Runbooks

Step-by-step guides for responding to specific operational situations. Living documents —
update after every incident.

- Directory: `docs/runbooks/` *(to be added)*

### Postmortems

Blameless incident retrospectives: what happened, root cause, action items.

- Directory: `docs/postmortems/` *(to be added)*

### Infrastructure maps

Deployment topology, cloud service inventory, Railway service graph.

- Directory: `docs/infra/` *(to be added)*

### Release process

How a change goes from merged PR to production across all five apps.

- File: `docs/operations/release-process.md` *(to be added)*

---

## Architecture

Design documentation for the platform and each app surface.

- Apps: `docs/architecture/apps/` *(to be added)*
- Platform packages: `docs/architecture/platform/`
  - Analytics: `docs/architecture/platform/analytics/analytics.md`
- Explanation overview: `docs/explanation/architecture-overview.md` *(to be added)*

---

## Governance

### prd-status

Single source of truth for cross-cutting concern × app readiness. Each file tracks one
package or app against the full set of platform concerns (analytics, billing, auth, logging).

- Directory: `docs/prd-status/`

### ADRs

Architecture Decision Records capturing significant decisions: context, options considered,
decision, consequences.

- Directory: `docs/adr/` *(to be added)*

### Compliance

Regulatory and audit requirements. Relevant for any feature that touches PII, PHI, or
financial data.

- Directory: `docs/compliance/` *(to be added)*

---

## New here?

Start with the onboarding docs before diving into any quadrant.

- Root onboarding: [ONBOARDING.md](../ONBOARDING.md)
- Extended onboarding: [docs/onboarding.md](onboarding.md)
- Shared vocabulary: [docs/glossary.md](glossary.md)
- Secrets policy: [docs/secrets.md](secrets.md)

---

Last reviewed: 2026-04-28 — owner: TBD
