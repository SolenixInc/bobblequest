# docs/

## What this file is for

Brief orientation to this folder and a navigable index of its contents. Every docs subdirectory
follows Diátaxis: tutorials, how-to guides, reference material, and explanations are kept in
separate folders so readers land in the right quadrant immediately.

This folder is the documentation surface for the cloned project. The Diátaxis hub at
`docs/index.md` is the canonical entry point — start there.

## When to update it

- A new top-level folder is added under `docs/`
- An existing folder changes its purpose or is renamed
- The canonical entry point moves

---

## Index

| Doc | Purpose |
| --- | --- |
| [docs/index.md](index.md) | Canonical entry point — full Diátaxis hub and cross-links |
| [docs/agents/landing.md](agents/landing.md) | Agent orientation — context-loading model, first-edit checklist, repo map |
| [docs/onboarding.md](onboarding.md) | Full ramp guide (Day 1 → Week 2, tooling cheat sheet, stack reference) |
| [/ONBOARDING.md](../ONBOARDING.md) | Root quick-start; links to `docs/onboarding.md` for detail |
| [docs/glossary.md](glossary.md) | Project-wide term definitions |

---

## Folder map

| Path | Purpose |
| --- | --- |
| `tutorials/` | Learning-oriented walkthroughs (step-by-step, outcome-focused) |
| `how-to/` | Task-oriented recipes (goal-first, no theory) |
| `reference/` | Lookup material: env vars, scripts, ports, schema |
| `explanation/` | Conceptual and architectural narratives |
| `runbooks/` | Incident playbooks (detect → mitigate → resolve) |
| `postmortems/` | Blameless postmortem record |
| `infra/` | Infrastructure maps (network, service topology, DNS) |
| `operations/` | Operational policies: release process, on-call rotation, etc. |
| `architecture/` | Per-app and per-platform architecture docs |
| `prd-status/` | Single-source-of-truth concern × app build-out status |
| `compliance/` | Regulatory skeletons: SOC 2, HIPAA, ISO 27001, GDPR/CCPA |
| `adr/` | Architecture Decision Records (MADR format) |
| `artifacts/` | Generated artifacts: PDFs, exports, blueprints |
| `diagrams/` | System diagrams |
| `verification/` | Verification reports |

---

_Last reviewed: 2026-04-28 — owner: TBD_
