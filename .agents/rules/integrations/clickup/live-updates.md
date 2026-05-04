---
paths:
  - "**/*clickup*/**"
  - "**/*sprint*/**"
  - "**/*epic*/**"
  - "**/clickup*.md"
---

# ClickUp Live-Update Discipline

**Applies to:** Agents executing or collaborating on any ClickUp task

## The Rule

Every ClickUp task we execute gets **live updates**, not end-of-session dumps. The task is the source of truth — comments, checklist items, decisions, PR links, and blockers land on the task in near-real-time so any other agent can pick it up from the task alone.

### Update cadence — minimum

Post a task comment / update the task at each of:

1. **Start** — "starting: plan is X" comment. First move after reading the task, before any substantive tool call on the work itself.
2. **Each checklist item** — flip to done the moment it's done. Not batched at the end.
3. **Decisions** — every design or scope decision made during execution.
4. **Blockers** — the moment they surface, not "when I figure it out."
5. **PR link** — attached to the task the moment the PR is opened.
6. **Done** — summary comment when work is complete, then move status.

### Anti-patterns

- One end-of-session comment summarizing everything.
- Multiple checklist items flipped at once at the end.
- Moving status to Review/Done without a done-comment.
- Editing the description mid-stream instead of commenting (descriptions lose the temporal thread).
- Treating the task as notes for yourself — it's the handoff contract.

## The Test

Could a fresh agent open this task right now and continue work from the comments + checklist alone? If no, you've under-updated. Fix before the next substantive action.

## Why

User repeatedly has to re-instruct agents on ClickUp update discipline — each session batches and forgets. AGENTS.md says "task is source of truth, near-real-time updates, not batched" but interpreted as "update at end." This rule converts the principle into concrete trigger points. Zero-context handoff is the operational test.

## How to Apply

1. Task work begins → post the starting comment before any other substantive action on the work.
2. Each checklist item complete → flip immediately (use `clickup_update_task` with checklist_id, not batch at end).
3. Each decision / blocker → comment immediately via `clickup_create_task_comment`.
4. PR opened → attach URL via `clickup_add_task_link` in the same tool-call burst as the `gh pr create`.
5. Work complete → final summary comment, then status change.

## Paired Sensor

No current hook enforces this — ClickUp MCP calls are many and varied, so a simple tool-name matcher would over-fire. Future work: Stop hook that scans session for ClickUp task IDs touched and verifies a comment landed on each; nudges if missing.