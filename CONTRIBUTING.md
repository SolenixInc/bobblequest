# CONTRIBUTING.md

## What this file is for

This file defines contribution standards for every engineer working in this repo: branch naming,
commit format, PR expectations, hook rules, and review policy. Read it before opening your first PR.

## When to update it

- The branching model or merge strategy changes
- Allowed commit types or breaking-change conventions are added or removed
- The PR checklist gains a new required step
- Lefthook hook configuration changes in a way that affects contributors
- An owner is assigned and the footer needs updating

---

## Branching model

This repo uses **trunk-based development**. `main` is always releasable. All work happens on
short-lived feature branches that are opened against `main` and merged within one to three days.

**Branch name pattern:** `<type>/<short-slug>`

Examples:

```text
feat/trpc-auth-router
fix/clerk-token-expiry
chore/update-biome
docs/contributing-guide
```

Rules:
- Branches diverge from `main` and merge back to `main`.
- No long-lived branches. No `develop`, `staging`, or `release` branches.
- Delete the branch immediately after merge.

---

## Conventional Commits guide

Commit messages drive [release-please](https://github.com/googleapis/release-please). Malformed
messages are rejected by the `commit-msg` Lefthook hook (commitlint).

**Format:**

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

- Subject line: imperative mood, lowercase after the type prefix, no trailing period.
- Limit the subject line to 72 characters.
- Wrap body and footer lines at 100 characters.

### Allowed types

| Type | When to use |
| --- | --- |
| `feat` | A new feature visible to users or consumers of a package |
| `fix` | A bug fix |
| `chore` | Maintenance: dependency bumps, config tweaks, housekeeping |
| `docs` | Documentation only — no code change |
| `refactor` | Code restructure with no behavior change |
| `test` | Adding or updating tests only |
| `build` | Changes to build scripts, bundler config, Turbo pipeline |
| `ci` | CI/CD workflow changes (GitHub Actions, Lefthook) |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace — no logic change |
| `revert` | Reverts a previous commit |

### Breaking changes

A breaking change MUST be signaled in one of two ways:

1. Append `!` to the type/scope: `feat!:` or `fix(api)!:`
2. Add a `BREAKING CHANGE: <description>` footer to the commit body.

Both methods are valid. Prefer `!` for brevity when the subject line is self-explanatory.

### Examples

**New feature:**

```text
feat(api): add tRPC procedure for user profile updates
```

**Bug fix:**

```text
fix(auth): correct Clerk JWT expiry handling on token refresh
```

**Breaking change:**

```text
feat(db)!: rename users table column email to email_address

BREAKING CHANGE: Consumers of @t/db must update all references from
`users.email` to `users.email_address` and re-run migrations.
```

---

## Pull request checklist

Before marking a PR ready for review, verify every item:

- [ ] Tests added or updated for all changed behavior
- [ ] Docs updated in the same PR (README, TSDoc, runbooks, ADRs — wherever relevant)
- [ ] `docs/prd-status/` updated if this PR closes or progresses a PRD item
- [ ] ADR added under `docs/adr/` if this PR records an architectural decision
- [ ] CI is green: lint, typecheck, tests, secret scan all pass
- [ ] No `--no-verify` used on any commit in this branch
- [ ] No `LEFTHOOK_EXCLUDE` env var used to bypass hooks
- [ ] PR title follows Conventional Commits format (used as the squash-merge subject)

---

## Lefthook expectations

Lefthook hooks are **required**. They install automatically when you run `bun install` via the
`prepare` script. Do not disable or skip them.

**The following are strictly forbidden:**

- `git commit --no-verify`
- `LEFTHOOK=0 git commit ...`
- `LEFTHOOK_EXCLUDE=...` to silence a hook

If a hook fails, **fix the underlying problem**. Common causes:

| Symptom | Fix |
| --- | --- |
| Biome format fails | Run `bun run format`, stage the changes |
| Biome lint fails | Fix the lint violation; do not add inline disables |
| Typecheck fails | Resolve the TypeScript error before committing |
| commitlint rejects message | Rewrite to match the Conventional Commits format |
| Secret scan fires | Remove the secret; rotate it if it was ever committed |

Hooks run all checks in parallel and typically complete in 5–30 seconds. If a hook is taking
longer, investigate the root cause rather than bypassing it.

---

## Code review and merging

- **At least one approval** is required before merge.
- Reviewers should focus on: correctness, test coverage, type safety, layer boundaries
  (per `CONVENTIONS.md`), and breaking-change impact.
- The PR author resolves all open comments before merging.
- **Merge strategy: squash merge.** The squash commit subject must be a valid Conventional Commits
  message — use the PR title (which is already required to follow the format).
- After merge, delete the feature branch immediately.

---

## Related documents

- [CONVENTIONS.md](CONVENTIONS.md) — coding standards, layer rules, type safety, naming
- [docs/adr/README.md](docs/adr/README.md) — architectural decision records index
- [docs/index.md](docs/index.md) — docs tree map
- [docs/how-to/cut-a-release.md](docs/how-to/cut-a-release.md) — release process
- [SECURITY.md](SECURITY.md) — vulnerability reporting

---

_Last reviewed: 2026-04-28 — owner: TBD_
