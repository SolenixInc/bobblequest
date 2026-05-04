# Architecture Decision Records

## What this file is for

This file orients anyone opening `docs/adr/` for the first time. It explains what Architecture
Decision Records (ADRs) are, when the team writes them, how they are numbered and linked, and what
format we use.

## When to update it

Update this file when:

- The numbering convention changes.
- The trigger criteria for writing a new ADR change.
- The supersede-chain rules change.
- A new ADR is merged and the index below needs a new entry.

---

## What is an ADR?

An Architecture Decision Record is a short document that captures **a significant decision that has
already been made** — not a proposal, not a discussion thread, not a design doc. It records:

- The context that made the decision necessary.
- The options that were considered.
- The option that was chosen and why.
- The consequences (good, bad, neutral) the team accepted.

ADRs are immutable by design. Once accepted, the decision section is never edited. If the team
changes course, a **new** ADR supersedes the old one, and the old one is annotated to point forward.

---

## When to write one

Write an ADR when a decision meets **two or more** of these criteria:

| Criterion | Examples |
| --- | --- |
| Significant architectural impact | Choosing a framework, runtime, database, auth strategy, monorepo vs. polyrepo |
| Hard to reverse | Picking a wire format, committing to a vendor, adopting a data model |
| Affects multiple teams or services | Shared auth, shared event bus, API versioning policy |
| Will be re-litigated without a record | Anything you have explained more than twice |

Skip ADRs for: implementation details inside a single service, tactical refactors, routine
dependency upgrades, and anything easily undone in an afternoon.

---

## Format: MADR

We use **MADR** (Markdown Architectural Decision Records). MADR is GitHub-renderable,
tool-supported, and battle-tested across many teams.

The canonical template lives at [000-template.md](000-template.md).

### MADR section list

Required order:

```markdown
# NNN — <Short title>

## Status
## Context and problem statement
## Decision drivers
## Considered options
## Decision outcome
## Consequences
  ### Positive
  ### Negative
  ### Neutral
## Pros and cons of the options
  ### Option A
  ### Option B
## Links
```

---

## ADR conventions

### Numbering

- Numbers are **zero-padded to 3 digits**: `000`, `001`, `002`, ...
- Numbers are **monotonically increasing** — never reuse a number, even if an ADR is deleted.

### File naming

`NNN-kebab-case-title.md`

### Status field allowed values

| Value | Meaning |
| --- | --- |
| `Proposed` | Drafted, not yet accepted by the team |
| `Accepted` | Team agreed; this is the current decision |
| `Deprecated` | No longer applies; not superseded by a specific new ADR |
| `Superseded by [NNN-new-title.md](NNN-new-title.md)` | A newer ADR replaced this one |

### Supersession syntax

When ADR `NNN` supersedes `MMM`:

1. In the **new ADR** (`NNN`): set `Status: Accepted` and add a `Links` entry:

   ```markdown
   ## Links
   - Supersedes: [MMM-old-title.md](MMM-old-title.md)
   ```

2. In the **superseded ADR** (`MMM`): prepend a blockquote at the very top of the file body (after
   frontmatter):

   ```markdown
   > Superseded by [NNN-new-title.md](NNN-new-title.md)
   ```

   Then update its `Status:` line to `Superseded by [NNN-new-title.md](NNN-new-title.md)`.
3. **Never edit the `Decision outcome` section of a superseded ADR.** The historical record must be
   preserved exactly.

---

## ADR index

| ADR | Title | Status |
| --- | --- | --- |
| [000](000-template.md) | Template (copy-paste starting point) | — |
| [001](001-platform-package-split.md) | Platform package split: types/browser/native convention | Accepted |
| [002](002-clerk-mobile-adoption.md) | Clerk adoption for mobile auth | Accepted |
| [003](003-bun-runtime-and-turbo.md) | Bun runtime and Turbo monorepo | Accepted |
| [004](004-drizzle-orm.md) | Drizzle ORM | Accepted |
| [005](005-revenuecat-primary-billing.md) | RevenueCat primary billing | Accepted |
| [006](006-trpc-over-rest.md) | tRPC over REST | Accepted |
| [007](007-prd-status-governance.md) | prd-status governance | Accepted |
| [008](008-conventional-commits-and-release-please.md) | Conventional Commits and release-please | Accepted |

---

## See also

- Template: [000-template.md](000-template.md)
- Doc index: [`/docs/index.md`](/docs/index.md)

---

_Last reviewed: 2026-04-28 — owner: TBD_
