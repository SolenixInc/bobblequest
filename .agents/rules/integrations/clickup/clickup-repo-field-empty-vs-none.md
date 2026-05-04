---
paths:
  - "**/*clickup*/**"
  - "**/*sprint*/**"
  - "**/*epic*/**"
  - "**/clickup*.md"
---

# ClickUp Repository Field — Empty vs "None"

**Applies to:** Agents creating or updating ClickUp tasks with the Repository custom field

## The Rule

When setting the Repository custom field on ClickUp tasks, distinguish between **empty** (unassigned/unknown) and **"None"** (intentionally not repo-related).

- Empty = hasn't been categorized yet.
- None = this work doesn't involve any repository (e.g., Railway project setup, vendor account config, external tooling).

## Why

The user considers these semantically different. Leaving empty when the work is genuinely repo-less destroys the distinction and makes "unassigned" indistinguishable from "not applicable."

## How to Apply

- Always set Repository to **"None"** (label ID `51d8efd3-9ed9-4fd1-8989-c55247f669e6`) for tasks that are explicitly not tied to a repo.
- Don't leave it empty unless you genuinely don't know which repo applies.