# Releases & CI Gate

How changes flow from a PR into a tagged GitHub Release in projects bootstrapped from this
template, plus the full list of checks the CI Gate enforces and how to reproduce each one
locally.

Audience: a developer joining a project cloned from `template-repo` who needs to land
changes that pass CI on the first push.

## 1. Merge strategy

Squash-and-merge is the only enabled merge strategy on `main`. Rebase-merge and
merge-commits are disabled at the repo level.

```text
   feature branch                  main
   ──────●──●──●──┐               ──────────●─────────►
                  │ squash merge          (single commit,
                  └─────────────────────►  PR title becomes
                                           the commit message)
```

Why squash-only:

- The PR title becomes the single commit on `main`, so we only enforce
  Conventional Commits in one place (the PR title).
- `release-please` reads commit messages on `main` to compute version bumps and
  generate `CHANGELOG.md`. Squash merges give it exactly one well-formed line per
  PR.
- `main` history stays linear and reviewable.

## 2. Conventional commits and PR titles

Every PR title MUST match:

```text
<type>(<scope>): <subject>

example: feat(api): add /users endpoint
example: fix(web): handle empty pricing response
example: chore(deps): bump turbo to 2.5.0
```

Allowed types and the release impact each one has:

| Type                      | Release impact                                            |
|---------------------------|-----------------------------------------------------------|
| `feat`                    | Minor version bump (`X.Y+1.0`)                            |
| `fix`                     | Patch version bump (`X.Y.Z+1`)                            |
| `feat!`                   | Major version bump (`X+1.0.0`) — breaking change          |
| `BREAKING CHANGE:` footer | Major bump regardless of type                             |
| `chore`                   | No bump, omitted from changelog                           |
| `docs`                    | No bump, omitted from changelog                           |
| `refactor`                | No bump, omitted from changelog                           |
| `test`                    | No bump, omitted from changelog                           |
| `style`                   | No bump, omitted from changelog                           |
| `ci`                      | No bump, omitted from changelog                           |
| `build`                   | No bump, omitted from changelog                           |
| `perf`                    | No bump, omitted from changelog                           |

Where the format is enforced:

- **PR title** — `amannn/action-semantic-pull-request` runs as a step in the CI Gate
  workflow. A non-conformant title blocks merge.
- **Branch commit messages** — `lefthook` + `commitlint` run on `commit-msg` locally,
  and the same `commitlint --from=<base> --to=<head>` runs as a step in the CI Gate
  workflow. Both must pass before merge.

For the full Conventional Commits spec see
<https://www.conventionalcommits.org/en/v1.0.0/>.

## 3. Release-please flow

```text
  ┌─────────────────────┐                                   ┌──────────────────┐
  │ contributor merges  │                                   │ contributor #2   │
  │ feat PR into main   │                                   │ fix PR into main │
  └──────────┬──────────┘                                   └────────┬─────────┘
             │                                                       │
             ▼                                                       ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ release-please action runs on every push to main                         │
  │ - parses conventional-commit titles since last release                   │
  │ - computes next version (semver: feat → minor, fix → patch, ! → major)   │
  │ - opens or updates a PR titled  chore(main): release X.Y.Z               │
  │ - PR body contains the regenerated CHANGELOG.md diff                     │
  └────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │ release PR sits open,      │
                          │ accumulating commits, until │
                          │ a maintainer merges it     │
                          └─────────────┬──────────────┘
                                        │ squash-merge
                                        ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ release-please reacts to the merge:                                      │
  │ - creates git tag  vX.Y.Z                                                │
  │ - creates GitHub Release  vX.Y.Z  (notes = changelog section)            │
  │ - downstream publish workflows trigger off the tag (if configured)       │
  └──────────────────────────────────────────────────────────────────────────┘
```

What you do as a contributor:

- Open your PR with a Conventional Commit-formatted title.
- Get it reviewed and merged.
- Done. `release-please` handles versioning, changelog, tag, and release creation.
  You never touch `CHANGELOG.md` or `package.json` versions by hand.

What you do as a maintainer cutting a release:

- Find the open PR titled `chore(main): release X.Y.Z`.
- Review the `CHANGELOG.md` diff in that PR — it should match what shipped since
  the last release.
- Merge the release PR. The merge fires the tag + GitHub Release automatically.

## 4. CI Gate — what's enforced and how to fix locally

Every PR runs the `verify` job in `.github/workflows/ci.yml`. The job is a single
sticky-comment dashboard on the PR, with one row per check:

| Check                      | What it validates                                                | Local reproduction                                             |
|----------------------------|------------------------------------------------------------------|----------------------------------------------------------------|
| Commit message lint        | Each commit on the PR matches Conventional Commit format         | `bunx commitlint --from=origin/main --to=HEAD --verbose`       |
| PR title lint              | PR title matches Conventional Commit format                      | (no local repro — edit the PR title in the GitHub UI)          |
| Format check               | Biome formatting is clean                                        | `bun run format:check` (autofix: `bun run format`)             |
| Lint                       | Biome lint rules pass across affected workspaces                 | `bun run lint`                                                 |
| Dependency audit           | `bun audit` reports zero advisories                              | `bun audit`                                                    |
| Markdown lint              | `markdownlint-cli2` rules from `.markdownlint.jsonc`             | `bunx markdownlint-cli2 --config .markdownlint.jsonc "**/*.md"`|
| Link check                 | Lychee finds no broken links in changed Markdown                 | `bunx lychee --offline './**/*.md'`                            |
| Typecheck                  | `tsc` passes across all affected workspaces                      | `bun run typecheck`                                            |
| Drizzle migrations in sync | `drizzle-kit check` finds no schema drift                        | `cd packages/db && bunx drizzle-kit check`                     |
| Test & coverage            | Vitest passes, coverage thresholds met                           | `bun run test` (or `bun run test:coverage`)                    |
| Build                      | `turbo run build` succeeds for all affected apps + packages      | `bun run build`                                                |
| Bundle size budget         | `size-limit` thresholds in `apps/web` and `apps/api`             | `cd apps/web && bunx size-limit` (and `apps/api`)              |
| Doctor                     | Repo invariants — env shape, scripts, configs                    | `bun run doctor`                                               |
| E2E tests                  | Playwright suites in `apps/web` and `apps/website`               | `cd apps/web && bunx playwright test` (and `apps/website`)     |

Notes on scope and skipping:

- On PRs, most checks run only against affected workspaces via
  `--filter=...[origin/main...HEAD]`. Push to `main` and `workflow_dispatch` runs
  the full matrix.
- `Markdown lint`, `Link check`, `Bundle size budget`, and `E2E tests` are gated
  on whether their inputs changed in the PR. If gated off, they record `pass`
  (skipped) — that is intentional, not a green-rubber-stamp.
- `FORCE_FULL_CI=true` (set on the `chore/ci-config-review` branch and via the
  `force_e2e` workflow_dispatch input) forces every step to run the full matrix.

When a check fails:

1. Read the row in the PR's `CI Gate` sticky comment to see which step failed.
2. Open the workflow run linked from that check and scroll to the failing step.
3. Reproduce locally with the command in the table above.
4. Fix, commit (with a Conventional Commit message), push.

## 5. Required status checks (branch protection)

`main` branch protection requires `CI Gate / verify` as the **sole** required
status check. Every other check inside the verify job is reported via the sticky
PR comment, not as an independent GitHub status — branch protection only needs
the umbrella job to pass.

Configuring this is a maintainer responsibility, in
**Settings → Branches → Branch protection rules → main**:

- Require a pull request before merging
- Require status checks to pass before merging → add `CI Gate / verify`
- Require branches to be up to date before merging
- Restrict who can push to matching branches (admins only)
- Allow squash merging only — disable rebase-merge and merge-commit

## See also

- [How to cut a release](../how-to/cut-a-release.md) — maintainer playbook
- `.github/workflows/ci.yml` — the verify job source of truth
- `.markdownlint.jsonc` — Markdown lint rules used by CI and pre-commit
- <https://www.conventionalcommits.org/en/v1.0.0/> — Conventional Commits spec
- <https://github.com/googleapis/release-please> — release-please reference
