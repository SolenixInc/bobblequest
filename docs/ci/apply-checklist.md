# Apply checklist — Solenix baseline release + CI package

Companion to [`release-strategy.md`](./release-strategy.md) (full policy) and the baseline package design (`t_710452a9`).

**Audience:** platform-devops / eng IC applying baseline to a product repo.  
**Mode:** API-first inventory; one shallow clone at a time; no org-wide full clones.

## Preflight

1. `gh api repos/ORG/REPO --jq '{default_branch,allow_auto_merge,archived}'`
2. List workflows: `gh api repos/ORG/REPO/contents/.github/workflows --jq '.[].name'`
3. Required checks / rulesets: `gh api repos/ORG/REPO/rulesets` then GET each id
4. Classify stack: Bun monorepo (template) | platform multi-service (ai-gateway) | other

## Must land

| Item | Pass |
| --- | --- |
| Check name exactly `ci-gate` | Required context matches ruleset |
| Triggers include `merge_group` | MQ safe |
| Squash-only land + linear history | Align with org ruleset |
| SolenixAI formal review on ordinary PRs | eng IC seat, bot actor |
| Auto-merge via dedicated Actions only | Not review workers; not n8n until proven |
| release-please (or equivalent) on main | Changelog/tags owned by bot |
| Pre-commit ids match CI | Local parity |

## Canary proof (per repo)

1. Non-hot-surface PR: green `ci-gate` → SolenixAI APPROVE → auto-merge SQUASH / MQ → land without `--admin`
2. Hot-surface PR: waits for CODEOWNERS
3. Post-land health smoke if prod is in scope
4. Record PR URLs in rollout kanban metadata

## Non-goals (do not do)

- Admin bypass happy path
- Second required check name
- Dual auto-merge writers
- Full-org clone trees into kanban scratch

Full policy: see `release-strategy.md`.
