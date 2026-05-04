# Pull Request

## Summary
<!-- 1-3 sentences. What changes and why. Link to ticket / issue / ADR if applicable. -->

## Type of change
<!-- Pick the Conventional Commits type that matches the squash-merge title:
- feat: new feature (bumps minor in release-please)
- fix: bug fix (bumps patch)
- docs: documentation only
- refactor: code change without behavior change
- test: tests only
- chore: tooling, deps, build
- ci: CI workflow changes
- perf: performance improvement
- build: build system / packaging
- revert: revert previous commit
- feat! / fix! / `BREAKING CHANGE:` footer: breaking change (bumps major)
-->

## Linked tasks / issues
<!-- ClickUp / GitHub issue / ADR links. Required if the change is non-trivial. -->

## Testing
<!-- How was this verified?
- [ ] Unit tests added / updated
- [ ] Integration tests added / updated
- [ ] Manual smoke test (describe steps)
- [ ] N/A (explain why)
-->

## Documentation
<!-- Docs MUST be updated in the same PR if any of these are touched:
- [ ] README / per-app or per-package README updated
- [ ] docs/reference/*, docs/how-to/*, docs/runbooks/* updated
- [ ] ADR added under docs/adr/ for architectural decisions
- [ ] docs/prd-status/{matrix,gaps}.md updated for tracked work
- [ ] N/A — change is internal-only with no doc surface
-->

## Pre-merge checklist

- [ ] CI Gate is green (`CI Gate / ci-gate` check passes)
- [ ] Conventional Commits title matches the type above
- [ ] No `--no-verify`, no `LEFTHOOK_EXCLUDE`, no skipped hooks
- [ ] No secrets / .env values committed
- [ ] PR is small enough to review in one sitting (< 400 lines diff if possible)
