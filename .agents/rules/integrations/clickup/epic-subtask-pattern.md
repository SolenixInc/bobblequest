---
paths:
  - "**/*clickup*/**"
  - "**/*sprint*/**"
  - "**/*epic*/**"
  - "**/clickup*.md"
---

# Epic / Subtask Usage Pattern

**Applies to:** Agents creating or structuring ClickUp tasks, especially epics and subtasks

## The Rule

**Epics are the PRIMARY ticket** — they live on the sprint board, they're what gets tracked and moved. Subtasks follow the epic automatically. Only create subtasks if they can be completed in ISOLATION from each other.

## Why

The board should show epics as the units of work. Subtasks are implementation components, not standalone tracked items. A web of dependencies between subtasks means the decomposition is wrong.

## How to Apply

- Epics go in the Sprint list directly — NOT in Backlog with children in Sprint.
- Subtasks are children of the epic and follow it wherever it moves.
- ONLY create subtasks if they can be completed in ISOLATION from each other (no inter-subtask dependencies).
- Each subtask = one focused, small PR with complete end-to-end feature implementation for that piece.
- If two pieces of work depend on each other, they should NOT be subtasks of the same epic — restructure the work or make them separate tasks.
- Never create a web of dependencies between subtasks — that means the decomposition is wrong.