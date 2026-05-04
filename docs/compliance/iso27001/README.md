# ISO 27001 (stub)

## What this file is for

Placeholder for ISO 27001 certification work. Fill this in when pursuing international
information-security certification. Until then, nothing here is binding.

## When to update it

When the certification is initiated: populate the ISMS scope statement, assign an owner,
and agree on a certification body before beginning controls work.

## Status

Not pursued. Activate for international information-security certification.

## Scope (when activated)

An ISMS scope statement is required at activation. It must define which systems, processes,
and locations are in-scope for the Information Security Management System. Agree scope with
the certification body before controls work begins.

## Annex A control families

- Organizational controls
- People controls
- Physical controls
- Technological controls

The applicable controls within each family are selected during the risk assessment and
documented in the Statement of Applicability.

## Folder layout (when activated)

```text
iso27001/
  isms/            # ISMS scope, policy, Statement of Applicability
  controls/        # individual implemented controls
  risk-register/   # identified risks, ratings, treatment decisions
  audit-evidence/  # evidence collected for internal and certification audits
```

## Activation checklist

- [ ] Write ADR documenting why ISO 27001 is being pursued
- [ ] Define ISMS scope and assign ISMS owner
- [ ] Complete risk assessment
- [ ] Produce Statement of Applicability
- [ ] Implement selected controls
- [ ] Internal audit
- [ ] Certification audit with accredited body
- [ ] Add entry to `../AUDIT-LOG.md`

## See also

- `../README.md`
- `../AUDIT-LOG.md`

---
_Last reviewed: 2026-04-28 — owner: TBD_
