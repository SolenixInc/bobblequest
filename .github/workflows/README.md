# CI Workflows

## Overview

The pipeline has a single required check for branch protection: **CI Gate / ci-gate**.
Every other job feeds into that aggregator. PRs get a persistent sticky comment (via
`unified-pr-reporter`) that updates in real time as each section completes.

## Workflow files

| File            | Trigger                                    | Purpose                                      |
| --------------- | ------------------------------------------ | -------------------------------------------- |
| `ci.yml`        | push/PR to `main`, `workflow_dispatch`     | CI Gate orchestrator — all checks live here  |
| `release.yml`   | push to `main`                             | release-please release automation            |

CodeQL has been removed. Link checking and markdown linting are folded into `ci.yml`.

## CI Gate orchestrator (`ci.yml`)

### Job DAG

```text
T-1  initialize (PR only) ─────────────────────────── post queued sticky comment
T0   secret-scan   commitlint (PR only)
T1   setup ← secret-scan
     format-check  lint  audit  link-check  markdownlint  ← setup
T2   typecheck (matrix)  drizzle-check  ← T1
T3   test  ← T2
T4   build  ← T3
T5   size-limit  e2e  doctor  ← T4
     ci-gate (aggregator, if: always())  ← all of the above
```

### Jobs

| Job | Tier | Purpose |
| --- | ---- | ------- |
| `initialize` | T-1 | Creates the sticky PR comment with all sections in "queued" state |
| `secret-scan` | T0 | Gitleaks scan of full history; blocks all installs on leak |
| `commitlint` | T0 | Enforces Conventional Commits on all PR commits |
| `setup` | T1 | Bun install, computes turbo `--filter` for affected packages, warms caches |
| `format-check` | T1 | Biome CI format check |
| `lint` | T1 | Turbo-powered Biome check across affected packages |
| `audit` | T1 | Bun dependency audit — advisory at high, hard-fail at critical |
| `link-check` | T1 | Lychee link checker across all markdown files (paths-changed-aware) |
| `markdownlint` | T1 | markdownlint-cli2 across changed markdown files (paths-changed-aware) |
| `typecheck` | T2 | TypeScript typecheck matrix (api, web, mobile, desktop, website) |
| `drizzle-check` | T2 | Verifies Drizzle migrations are in sync with schema |
| `test` | T3 | Unit tests + coverage across affected packages; uploads `coverage-report` artifact |
| `build` | T4 | Turbo build across affected packages; uploads `build-output` artifact |
| `size-limit` | T5 | Bundle size budget check for apps/web and apps/api |
| `e2e` | T5 | Playwright tests for apps/web and apps/website (paths-changed-aware) |
| `doctor` | T5 | Repo health checks via `bun run doctor --ci --fast` |
| `ci-gate` | agg | Aggregates all job results; the single required check; posts final report |

### Sticky PR comment

Every tier job includes a final step `if: always()` that calls
`./.github/actions/unified-pr-reporter` to update that section's status in the
persistent PR comment. The `initialize` job creates the comment at the start of
each run (wiping any previous run's comment to prevent duplicates). The `ci-gate`
job posts the final summary table.

The composite action lives at `.github/actions/unified-pr-reporter/action.yml`.
It is repo-agnostic and uses only the GitHub Script API — no third-party apps required.

### Idempotency and concurrency

- PRs: `cancel-in-progress: true` — only the latest push runs.
- Main: `cancel-in-progress: false` — merge commits always complete.
- Each run wipes the previous sticky comment on initialize, so outdated reports
  from cancelled runs are replaced cleanly.

### Required check for branch protection

Set exactly one required status check:

```text
CI Gate / ci-gate
```

The `ci-gate` job exits 1 if any required job (secret-scan, setup, format-check,
lint, audit, typecheck, drizzle-check, test, build, size-limit, e2e, doctor)
failed or was cancelled. Optional jobs (commitlint, link-check, markdownlint) do
not gate the aggregator exit code but their sections update the PR comment.

### Required secrets and variables

| Name            | Type     | Purpose                                    |
| --------------- | -------- | ------------------------------------------ |
| `TURBO_TOKEN`   | Secret   | Turbo remote cache authentication token    |
| `TURBO_TEAM`    | Variable | Turbo team slug for remote cache isolation |

Configure at: **Settings -> Secrets and variables -> Actions**

Turbo falls back to local cache when these are absent — the pipeline runs without them.

## Release workflow (`release.yml`)

Triggered on push to `main`. Runs `release-please` to create/update release PRs
and draft GitHub releases. Has `cancel-in-progress: false` so release jobs always
complete — a mid-release cancellation would leave the changelog in a partial state.

### Commitlint

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/).
Config: `commitlint.config.js` at repo root.

Examples:

- `feat(api): add user authentication endpoint`
- `fix(web): resolve hydration mismatch on login page`
- `chore: bump dependencies`

## Required check

Org baseline requires the check name exactly **`ci-gate`** (workflow `ci-gate.yml`). Do not rename the final job.
