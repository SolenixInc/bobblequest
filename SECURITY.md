# SECURITY.md

## What this file is for

Defines how to report a security vulnerability in this project privately, before any internal or
external disclosure. The process here gives the team time to assess and fix the issue before it
is shared more broadly.

## When to update it

- The security contact email address or Slack channel changes
- A PGP key is generated and published
- Response SLAs are updated
- The out-of-scope list changes
- A new compliance requirement affects the disclosure process

---

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities through internal channels only:

- Slack: <#security>
- Email: <security@example.com>

If the report is sensitive, encrypt it with our PGP key (see below). Include as much detail as
possible to help us reproduce and assess the issue quickly.

### What to include

- Step-by-step reproduction instructions
- Impact assessment — what can an attacker accomplish?
- Affected versions or commit ranges
- Any suggested mitigation or fix you have identified
- Your name and contact information (optional; we respect anonymous reports)

### What NOT to do

- Never file a public GitHub issue for any security finding — even one you believe is low severity
- Never share vulnerability details in public Slack channels, public forums, or external chat
- Do not run automated scanners against production systems without prior approval
- Do not attempt to access, modify, or exfiltrate any data beyond what is necessary to demonstrate
  the vulnerability

---

## PGP key

```text
<PASTE PUBLIC PGP KEY OR REMOVE THIS SECTION>
```

Fingerprint: `<KEY-FINGERPRINT>`

---

## Response SLAs

| Stage | Target |
| --- | --- |
| Acknowledgement | Within 48 hours of receipt |
| Triage (severity + validity confirmed) | Within 5 business days |
| Fix target — P1 (critical) | Within 24 hours |
| Fix target — P2 (high/medium) | Within 7 days |
| Fix target — P3 (low) | Within 30 days |

If you have not heard from us within the acknowledgement window, follow up in <#security> or at
<security@example.com>.

---

## Coordinated disclosure

This is a proprietary internal repository. There is no public CVE flow or public security advisory
process. Once a fix is shipped, the team will:

1. Update the relevant runbook or ADR with a post-mortem summary
2. Notify affected internal consumers via <#security> or direct message
3. Credit the reporter in the internal post-mortem (unless anonymity is preferred)

---

## Out of scope

The following are generally not accepted as qualifying vulnerabilities:

- Rate limiting or brute-force protection on endpoints not serving sensitive data
- Missing security headers on static documentation sites
- SPF/DKIM/DMARC configuration on non-sending domains
- Self-XSS (requires the user to run code themselves)
- Theoretical vulnerabilities without a practical exploit path
- Findings from automated scanners without manual validation
- Third-party dependency vulnerabilities — report those directly to the upstream maintainer
- Social engineering attacks targeting team members
- Physical access issues

If you are unsure whether your finding qualifies, send it anyway — we would rather over-triage than
miss a real issue.

---

## Related controls

- `docs/compliance/README.md` — full set of security controls, audit trail requirements, and
  compliance mappings
- `docs/runbooks/00-template.md` — incident response runbook template

---

_Last reviewed: 2026-04-28 — owner: TBD_
