# Compliance

## What this file is for

Central index for compliance work. Points to framework stubs, the audit log, and the
activation procedure a team follows when a framework becomes relevant.

## When to update it

- A framework moves from "not pursued" to active.
- The folder map changes (new subfolder, renamed path).
- The activation procedure is revised.
- The "see also" links go stale.

## Frameworks at a glance

| Framework   | Applies when...                                          | Stub at                        | Status       |
| --- | --- | --- | --- |
| SOC 2       | Selling to enterprise customers requiring SOC 2 Type II  | `docs/compliance/soc2/`        | Not pursued  |
| HIPAA       | Storing or processing PHI (US healthcare)                | `docs/compliance/hipaa/`       | Not pursued  |
| ISO 27001   | International information-security certification         | `docs/compliance/iso27001/`    | Not pursued  |
| GDPR / CCPA | Serving EU or California residents                       | `docs/compliance/gdpr-ccpa/`   | Not pursued  |

## Folder map

Each framework lives in its own subfolder with a `README.md` that scopes the work. When a
framework is activated, controls, evidence, and policies land as sibling directories inside
that subfolder (`controls/`, `evidence/`, `policies/`). Nothing lives at this top level
except this README and `AUDIT-LOG.md`.

## Audit log

All compliance-relevant changes are recorded in `docs/compliance/AUDIT-LOG.md`. The log is
append-only, write-once, and each entry is signed by an author and a reviewer before the
commit is merged. Do not edit or delete existing entries.

## Activation procedure

When any framework becomes relevant:

1. Write an ADR documenting why the framework is being pursued and what the timeline is.
2. Populate the framework's `README.md` with scope, timeline, and auditor contact.
3. Begin landing controls and evidence as individual files inside `controls/` and `evidence/`.
4. Keep `AUDIT-LOG.md` synced — every material change gets an entry.

## See also

- `/SECURITY.md`
- `/docs/secrets.md`
- ADR index (when added)
- `docs/compliance/soc2/README.md`
- `docs/compliance/hipaa/README.md`
- `docs/compliance/iso27001/README.md`
- `docs/compliance/gdpr-ccpa/README.md`

---
_Last reviewed: 2026-04-28 — owner: TBD_
