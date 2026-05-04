# GDPR and CCPA (stub)

## What this file is for

Placeholder for GDPR and CCPA compliance work. Fill this in when the product serves EU
residents (GDPR) or California residents (CCPA). Until then, nothing here is binding.

## When to update it

When any app begins accepting users from the EU or California: identify lawful basis, sign
DPAs, and publish a privacy notice before accepting personal data.

## Status

Not pursued. Activate when serving EU residents (GDPR) or California residents (CCPA).

## Scope (when activated)

Identify which apps and services process personal data belonging to EU or California
residents. Services that provably exclude those residents can be noted as out of scope.

## Data subject rights (GDPR)

- Access — individuals may request a copy of their data
- Rectification — individuals may correct inaccurate data
- Erasure — individuals may request deletion ("right to be forgotten")
- Portability — individuals may receive data in a machine-readable format
- Restriction — individuals may limit how data is processed
- Objection — individuals may object to processing based on legitimate interests

## Consumer rights (CCPA)

- Know — consumers may request disclosure of what personal information is collected
- Delete — consumers may request deletion of personal information
- Opt-out — consumers may opt out of the sale of personal information
- Non-discrimination — consumers may not be penalized for exercising rights

## Folder layout (when activated)

```text
gdpr-ccpa/
  dpa/                        # Data Processing Addenda with all data processors
  dpia/                       # Data Protection Impact Assessments
  subject-request-procedures/ # Workflows for handling data subject / consumer requests
  cookie-policy/              # Cookie consent and policy documents
```

## Activation checklist

- [ ] Identify lawful basis for each processing activity (GDPR Art. 6)
- [ ] Sign DPAs with all data processors handling personal data
- [ ] Publish privacy notice covering both GDPR and CCPA requirements
- [ ] Implement subject-request workflow (target: 30-day response)
- [ ] Implement breach notification procedure (72-hour GDPR window)
- [ ] Maintain records of processing activities (GDPR Art. 30)
- [ ] Add entry to `../AUDIT-LOG.md`

## See also

- `../README.md`
- `../AUDIT-LOG.md`
- `/docs/secrets.md`

---
_Last reviewed: 2026-04-28 — owner: TBD_
