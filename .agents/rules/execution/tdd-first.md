# TDD-First Development

_Supplements the TDD section in AGENTS.md with quick-reference workflow._

## Quick Reference

1. **Red** — Write failing tests that define success criteria as executable assertions
2. **Green** — Minimum implementation to pass
3. **Refactor** — Clean up with green tests as safety net

## The Principle

Tests are the **success criteria expressed as code**. They define "done" in a way that is unambiguous, measurable, and automatically verifiable. Write them first — they are the blueprint you build toward, not verification you add after.

## Apply TDD

- New features → tests define the API/behavior before implementation
- Bug fixes → test reproduces the bug, then fix makes it pass
- Refactors → tests prove nothing broke

## Lighten Up For

- Trivial one-liners, config tweaks, pure docs
- Exploratory prototyping (convert to TDD once direction confirmed)
- Wiring and integration code where TDD adds friction — test-after is fine
