# Explanation template

**Quadrant:** Explanation — understanding-oriented. The "why" of the system. Conceptual, discursive,
tradeoff-aware. The reader is not trying to do anything right now; they are trying to understand.

---

## What this file is for

This template defines the standard format for every explanation document in `docs/explanation/`. Use
it when writing conceptual or architectural material whose purpose is to build mental models, not
guide actions.

See also: [/docs/index.md](/docs/index.md) |
[/docs/explanation/architecture-overview.md](architecture-overview.md)

## When to update it

- The team identifies a recurring structural problem in conceptual docs (e.g., too much step-by-step
  instruction creeping in)
- A related ADR changes how we document architectural decisions ([/docs/adr/](/docs/adr/))

---

### Why this file exists

Explanation docs are the most commonly mis-structured. The three failure modes:

1. **Turned into a tutorial.** Steps appear. The reader is "guided." The conceptual thread is lost.
2. **Turned into reference.** Lists of facts without context. The reader learns nothing about
   tradeoffs.
3. **Turned into a how-to.** "To understand X, first do Y." Action intrudes on understanding.

An explanation doc does none of those. It:

- Illuminates context and background
- Explains design decisions and the tradeoffs that shaped them
- Discusses alternatives and why they were not chosen
- Cross-links to tutorials, how-tos, and reference — but does not embed their content

If you catch yourself writing a numbered procedure or an exhaustive parameter table, move that
content to the appropriate quadrant and link to it.

---

### Worked example

**Topic: Why we use Conventional Commits + release-please**

Every commit in this repo follows the [Conventional Commits](https://www.conventionalcommits.org/)
spec (`feat:`, `fix:`, `docs:`, `chore:`, etc.). This is not style enforcement for its own sake —
it is a machine-readable contract between the author and the release toolchain.

`release-please` reads the commit log between the last tag and `HEAD`. Because the log is
structured, it can answer three questions automatically: (1) did any `feat:` land? If so, bump the
minor version. (2) did any `fix:` land? If so, bump the patch. (3) did any commit include
`BREAKING CHANGE:`? If so, bump the major. It then opens a PR that proposes the new version bump
and a generated `CHANGELOG.md` section — no human has to decide what the version number should be.

The tradeoff is upfront discipline. A commit message like `"stuff"` or `"wip"` provides no signal
and breaks the automation. Teams that skip the convention end up maintaining changelogs manually or
skipping them entirely, which degrades over time. Teams that adopt it upfront find that the
cognitive cost per commit is small (one prefix word) and the payoff — automated, trustworthy
releases — is large.

The alternative that was considered was manual versioning via `npm version` or editing
`package.json` by hand. That approach was rejected because it does not scale across a monorepo with
multiple independently-versioned packages and because it relies on the human to correctly interpret
the semantic impact of unreleased commits.

---

### Fill-in scaffold

Copy this block when writing a new explanation doc. Delete every `<!-- ... -->` comment before
publishing.

```markdown
## <CONCEPT>

<!-- One paragraph: what the reader will understand by the end of this doc.
     Not "this doc covers X" — write what insight they will gain. -->

## Background

<!-- Why does this exist? What problem does it solve?
     What was the situation before? What alternatives were considered? -->

## The mental model

<!-- Conceptual walk-through. Diagrams welcome (Mermaid or ASCII box-drawing).
     Describe relationships and responsibilities — not steps. -->

## Common misconceptions

<!-- Name the most common wrong mental models explicitly.
     Frame as "you might think X, but actually Y." -->

## See also

<!-- Ordered list: most relevant first.
     Include: related explanation docs, ADRs, tutorials, external resources. -->
```

---

_Last reviewed: 2026-04-28 — owner: TBD_
