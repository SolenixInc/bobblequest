# SOC 2 (stub)

## What this file is for

Placeholder for SOC 2 Type II compliance work. Fill this in when an enterprise customer
requires a SOC 2 report. Until then, nothing here is binding.

## When to update it

When the framework is activated: populate scope, auditor contact, and timeline before
beginning any controls work.

## Status

Not pursued. Activate when an enterprise customer requires SOC 2 Type II.

## Scope (when activated)

Define which services and data stores are in-scope. Scope must be agreed with the auditor
before controls work begins. Out-of-scope systems should be explicitly listed.

## Trust services criteria

- Security (required)
- Availability
- Processing integrity
- Confidentiality
- Privacy

Not all criteria need to be included — agree with the auditor which apply.

## Folder layout (when activated)

```text
soc2/
  controls/        # individual control files, one concern per file
  evidence/        # screenshots, exports, logs supporting each control
  policies/        # written policy documents
  assessments/     # gap assessments, readiness reports
```

## Activation checklist

- [ ] Write ADR documenting why SOC 2 is being pursued
- [ ] Engage auditor and agree on scope and criteria
- [ ] Populate this README with scope, timeline, and auditor
- [ ] Build control matrix mapping criteria to controls
- [ ] Begin evidence collection
- [ ] Gap remediation
- [ ] Audit window open
- [ ] Add entry to `../AUDIT-LOG.md`

## See also

- `../README.md`
- `../AUDIT-LOG.md`

---
_Last reviewed: 2026-04-28 — owner: TBD_
