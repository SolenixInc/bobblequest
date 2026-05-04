# Task Completion Protocol

**Applies to:** All agents, before declaring any non-trivial task done

## The Rule

Before wrapping up a non-trivial task (anything that modified files, created features, or changed structure), run a documentation pass.

## Checklist

1. **AGENTS.md** — Changed how the project works? Update or add the section.
2. **README.md** — Added features, packages, structure changes? Update.
3. **CONTRIBUTING.md** — Changed workflows, guidelines, thresholds? Update.
4. **ROADMAP.md / VISION.md** — Completed planned work? Mark done. Started new work? Note it.
5. **Skill/rule READMEs** — Added/modified skills or rules? Update the index.
6. **Handoff docs** — Completed work from `~/docs/plans/handoffs/`? Update status. New handoffs via `handoff` skill.
7. **Memory** — Learned persistent preferences, domain knowledge, decisions? Save.

## How

- Delegate doc updates to background subagents to conserve main context.
- Don't ask "should I update docs?" — just do it.
- Update only the sections affected; don't rewrite files.
- Commit with the work or as a `docs:` commit immediately after.

## Skip If

- Trivial change (typo, one-liner, read-only research)
- User explicitly said not to
- No docs exist and creating them wasn't scoped
