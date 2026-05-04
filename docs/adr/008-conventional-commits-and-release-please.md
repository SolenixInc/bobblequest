# 008 — Conventional Commits and release-please

## Status

Accepted

---

## Context and problem statement

Teams cloning this template need a release flow that works from day one: automated changelogs,
deterministic semver bumps, and no manual tag dance. Without automation, CHANGELOG.md drifts,
semver bumps become a judgment call, and release commits are authored inconsistently across
contributors and agents.

The monorepo uses a single root version (`"."` in `release-please-config.json`) rather than
per-package independent versions. Keeping all packages in lockstep simplifies consumer upgrades
and eliminates version skew between template packages.

Commit messages are the primary input to the release pipeline. Untyped commits produce no reliable
signal for bump magnitude. A lint gate at the commit-msg hook is required to make the pipeline
trustworthy.

---

## Decision drivers

- Automated CHANGELOG.md generation tied to every push to `main` — no hand-editing
- Deterministic semver bumps: `fix:` → patch, `feat:` → minor, `feat!:` or `BREAKING CHANGE:` →
  major
- Commit-msg lint enforced at the pre-commit hook level — drift is a CI failure, not a guideline
- Single root version for all packages — no per-package version book-keeping
- Minimal maintenance: the release flow must survive contributor turnover without documentation debt

---

## Considered options

- Option A: manual tagging + hand-authored CHANGELOG
- Option B: semantic-release
- Option C: Changesets
- Option D: Conventional Commits + release-please (chosen)

---

## Decision outcome

Chosen option: **Option D — Conventional Commits + release-please** — it is the lightest-weight
option for a single-root monorepo, requires no per-PR changeset file, and integrates directly with
GitHub Actions.

`commitlint` (config: `@commitlint/config-conventional`) enforces Conventional Commits at the
`commit-msg` hook via lefthook. `release-please-action` runs on every push to `main`; it opens a
release PR that bumps the root `package.json` version and regenerates `CHANGELOG.md`. Merging the
release PR triggers the tag + GitHub Release creation. The `release-please-config.json` root entry
(`packages: { ".": ... }`) locks the single-root versioning strategy.

Note: the release PR CI pipeline requires a PAT with `repo` + `workflow` scopes in
`RELEASE_PLEASE_TOKEN` so the downstream CI jobs fire when the release PR is opened (a
`GITHUB_TOKEN`
push from Actions does not re-trigger workflows by default).

---

## Consequences

### Positive

- Zero-touch releases: merge to `main` → release-please opens a versioned PR → merge → tag + release
- Commit type prefixes encode intent at author time, eliminating ambiguity in version bump decisions
- Breaking changes are flagged explicitly via `feat!:` or `BREAKING CHANGE:` footer — never silent
- `CHANGELOG.md` is always current and machine-generated; no manual entry required

### Negative

- Requires discipline: `fix:` vs `feat:` is a meaningful choice that affects the release version
- Release PRs need a PAT (`RELEASE_PLEASE_TOKEN`) for downstream CI to fire — adds one secret to
  manage per cloned repo
- Squash-merge workflows lose per-commit type signal; PR title must follow Conventional Commits if
  the repo squashes

### Neutral

- `CHANGELOG.md` is generated, never hand-edited; manual edits will be overwritten on the next
  release
- Agents authoring commits must follow Conventional Commits — `commitlint` will fail hooks that
  don't

---

## Pros and cons of the options

### Option A: manual tagging + hand-authored CHANGELOG

**Pros:**

- No tooling dependencies
- Full control over every CHANGELOG entry

**Cons:**

- CHANGELOG drifts immediately in practice — authors skip it under time pressure
- No enforcement: semver bumps are a judgment call with no audit trail
- Does not scale to multi-contributor or agent-authored commits

---

### Option B: semantic-release

**Pros:**

- Mature ecosystem; wide adoption in Node.js projects
- Supports multi-package publishing via plugins

**Cons:**

- Node-centric; less idiomatic in a Bun monorepo
- Release step runs on CI directly (no release PR to review before the tag lands)
- Plugin surface is larger than needed for a single-root version strategy

---

### Option C: Changesets

**Pros:**

- Excellent for independent per-package versioning in large monorepos
- Explicit changeset files per PR give granular control over bump level

**Cons:**

- Requires a `changeset add` step per PR — higher per-contributor friction
- Per-package versioning adds book-keeping overhead not justified for a single-root monorepo
- Changeset bot + GitHub App install adds external setup steps

---

### Option D: Conventional Commits + release-please (chosen)

**Pros:**

- Commit types drive bump magnitude automatically — no per-PR changeset file needed
- `release-please` opens a review-able release PR before any tag is created
- `release-please-config.json` lives in the repo; version strategy is code-reviewable
- First-class GitHub Actions integration; one workflow file is the entire release pipeline

**Cons:**

- Squash-merge workflows must ensure the PR title follows Conventional Commits
- PAT requirement for downstream CI on release PRs adds one setup step per cloned repo
- `release-please` is a Google-maintained project; longevity depends on continued Google OSS support

---

## Links

- `/release-please-config.json` — root versioning strategy and plugin config
- `/.github/workflows/release.yml` — release-please-action workflow
- `/CONTRIBUTING.md` — commit message format requirements and hook setup
- `/docs/how-to/cut-a-release.md` — step-by-step release guide for contributors

---

_Last reviewed: 2026-04-28 — owner: TBD_
