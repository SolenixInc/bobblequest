# Audit log

## What this file is for

Append-only record of compliance-relevant changes: control adoption, secret rotations, access
changes, framework activation, auditor engagements, and any other event with a regulatory
implication. This is not a changelog for code — it is a compliance record.

## When to update it

Every event with a regulatory implication, regardless of whether a framework has been
activated. Err on the side of over-recording.

## Rules

- Append-only. Never edit or delete an existing entry.
- Each entry is signed by an author and a reviewer.
- Dates are ISO 8601 (YYYY-MM-DD).
- Entries are reviewed and signed off as a final commit before any audit window opens.

## Entries

### 2026-04-28 — Compliance scaffold initialized

**Author:** `<TBD>`
**Reviewer:** `<TBD>`
**Type:** Initialization
**Description:** Compliance directory scaffolded. No framework activated. Stubs added for
SOC 2, HIPAA, ISO 27001, GDPR/CCPA. AUDIT-LOG.md created and bound to append-only
convention.

---
_Last reviewed: 2026-04-28 — owner: TBD_
