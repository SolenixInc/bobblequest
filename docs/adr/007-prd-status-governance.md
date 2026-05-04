# 007 — prd-status governance

## Status

Accepted

---

## Context and problem statement

The template monorepo tracks ten cross-cutting concerns (config, logging, errors, auth, DB, cache,
billing, analytics, DI, tests) across five client apps plus the shared package layer — 50+ cells of
readiness state. Without a single authoritative surface, engineers and agents must spelunk the repo
to answer "is X ready in Y?" Each agent session can contradict the previous one's status claims,
and gaps are discovered late (at integration time) rather than early.

Existing tooling options (GitHub Projects, ClickUp, Notion) live outside the repo. Changes to those
surfaces are not code-reviewed, not versioned alongside the code that triggered them, and are
silently
abandoned when the team switches tools. An in-repo solution tightly couples status information to
the
code that creates or closes the status.

---

## Decision drivers

- Single source of truth for concern × app readiness — no external dashboards to sync
- Status changes are code-reviewed in the same PR as the code change that caused them
- Gaps are visible at a glance so product and engineering share one status surface
- No drift: a status that cannot be updated by the author in the same commit should not exist
- Agent-friendly: automated agents must be able to read and update status without a browser

---

## Considered options

- Option A: ad-hoc READMEs per concern (scattered across packages and apps)
- Option B: GitHub Projects (kanban / table view)
- Option C: ClickUp (external project management)
- Option D: Notion (external wiki)
- Option E: in-repo `docs/prd-status/` (chosen)

---

## Decision outcome

Chosen option: **Option E — in-repo `docs/prd-status/`** — it lives with the code, is versioned in
git, requires no external accounts to read or write, and is reviewable on every PR.

`docs/prd-status/matrix.md` is the concern × app grid (50 cells). `docs/prd-status/gaps.md` is the
changelog of what changed and what is outstanding, organized by priority tier (P0–P3).
`docs/prd-status/README.md` defines the maintainer contract: every PR that affects a tracked concern
must update `matrix.md` and `gaps.md` in the same commit.

---

## Consequences

### Positive

- Single source of truth that lives with the code — no context switch to a browser
- Every status change is PR-reviewable; drift can only enter via a PR that skips the contract
- Agents can read and update the docs as part of the same dispatch that writes the code
- The file structure is grep-able, diffable, and LLM-queryable via graphify

### Negative

- Requires every author (human and agent) to update prd-status in the same commit; checklist toil
- Merge conflicts on `matrix.md` and `gaps.md` are likely when parallel branches both close gaps
- No rollup dashboards, swimlanes, or burndown charts without additional tooling

### Neutral

- Not a replacement for sprint planning — work prioritization and sprint assignment live in ClickUp
- File structure must evolve as new concerns or apps are added; the schema is not enforced by
  tooling

---

## Pros and cons of the options

### Option A: ad-hoc READMEs per concern

**Pros:**

- No new directory structure required
- Each package already has a natural home (`packages/<name>/README.md`)

**Cons:**

- No cross-cutting view — the concern × app grid does not exist
- No enforcement that a PR updates the right README
- Status aggregation requires reading N files; no single glance summary

---

### Option B: GitHub Projects

**Pros:**

- Built into GitHub; no extra tool account needed
- Table view supports custom fields (concern, app, status)
- Linked to issues and PRs natively

**Cons:**

- Lives outside the repo — not versioned, not code-reviewed
- Agents cannot write to GitHub Projects without an MCP or API call
- Status silently drifts when issues are closed without updating the project board

---

### Option C: ClickUp

**Pros:**

- Rich project management: sprints, dependencies, custom fields, burndown
- Used for sprint planning (separate concern from readiness tracking)

**Cons:**

- External service — requires a browser or API key to update
- Not code-reviewable; a ClickUp status change is invisible to `git log`
- Already serves sprint planning; conflating it with readiness tracking creates confusion

---

### Option D: Notion

**Pros:**

- Flexible: databases, tables, linked views
- Good for product documentation alongside engineering status

**Cons:**

- External service — same drift risk as ClickUp
- No structured enforcement (anyone can edit any cell at any time without review)
- Agents must use a Notion MCP or API; adds a dependency outside the repo

---

### Option E: in-repo `docs/prd-status/` (chosen)

**Pros:**

- Versioned in git alongside the code that creates or closes each status
- PR-reviewable: CI can gate on missing prd-status updates via commit-lint conventions
- Agents read and write via standard file tools — no external account needed
- graphify indexes the directory, making it queryable via graph queries

**Cons:**

- Flat markdown has no schema enforcement; a malformed row in `matrix.md` is silently wrong
- Merge conflicts on shared files require manual resolution
- No burndown or velocity charts without post-processing the git history

---

## Links

- `/docs/prd-status/README.md` — maintainer contract and live status diagram
- `/docs/prd-status/matrix.md` — concern × app grid (50 cells)
- `/docs/prd-status/gaps.md` — open and resolved gap changelog
- `/CONTRIBUTING.md` — PR checklist that references prd-status update requirement

---

_Last reviewed: 2026-04-28 — owner: TBD_
