# Solenix CI baseline

Canonical required check: **`ci-gate`** (workflow `.github/workflows/ci-gate.yml`, job name exactly `ci-gate`).

## Package surfaces

| Surface | Location |
| --- | --- |
| Required CI gate | `.github/workflows/ci-gate.yml` → job `ci-gate` |
| Local pre-push/commit gate | `lefthook.yml` (Bun monorepos) or `.pre-commit-config.yaml` (platform/Python) |
| AI-consumable summary | PR sticky `<!-- unified-ci-report -->` + step summary / `ci-summary` artifacts where present |
| Host-first local debug | `.vscode/launch.json` |
| Release policy | `docs/ci/release-strategy.md` (template-repo source of truth when landed) |

## Triggers

- `pull_request` / `push` to `main`
- `merge_group` (merge queue)
- `workflow_dispatch`

## Security defaults

- gitleaks in CI (and local when installed)
- dependency audit at critical where the stack supports it
- semgrep may be trial (`continue-on-error`) until graduated

## Non-goals

- Second required check name
- Admin-bypass happy path
- Inventing per-repo one-off CI systems outside this package
