# HIPAA (stub)

## What this file is for

Placeholder for HIPAA compliance work. Fill this in when the product will store or process
protected health information (PHI). Until then, nothing here is binding.

## When to update it

When PHI flows into any system: populate scope, BAA status, and safeguard implementation
plan before any PHI is accepted.

## Status

Not pursued. Activate when storing or processing protected health information (PHI).

## Scope (when activated)

Only systems that handle PHI are in-scope. Services that never touch PHI are explicitly
excluded. Document the data-flow boundary here so it is clear what is in and out.

## Required safeguards

- Administrative — policies, training, access management, incident procedures
- Physical — facility access controls, workstation security, device controls
- Technical — access control, audit controls, integrity controls, transmission security

All three categories are required under the HIPAA Security Rule.

## Folder layout (when activated)

```text
hipaa/
  bas/                     # Business Associate Agreements with each vendor touching PHI
  controls/                # individual control files
  policies/                # written policy documents
  breach-procedures/       # breach notification and incident response
```

## Activation checklist

- [ ] Identify all PHI flows (ingestion, storage, transmission, deletion)
- [ ] Sign BAAs with every upstream vendor that handles PHI
- [ ] Verify encryption at rest and in transit for all PHI stores
- [ ] Implement access logging for PHI access
- [ ] Enforce minimum-necessary access principle
- [ ] Document breach notification procedure (60-day notification window)
- [ ] Add entry to `../AUDIT-LOG.md`

## See also

- `../README.md`
- `../AUDIT-LOG.md`
- `/docs/runbooks/` — incident playbooks may need HIPAA-specific variants

---
_Last reviewed: 2026-04-28 — owner: TBD_
