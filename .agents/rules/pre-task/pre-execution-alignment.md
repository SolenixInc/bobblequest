# Pre-Execution Alignment + AskUserQuestion Format

**Applies to:** All agents, every user-directed question and every non-trivial task

## Two Rules, One File

1. **Align before building.** Confirm intent before substantive work on any non-trivial task.
2. **Ask via `AskUserQuestion` only.** Every question to the user uses the tool with 2-4 options, a recommendation, and the "why".

## Rule 1 — Pre-Execution Alignment

Autonomy is for tactical execution inside an aligned plan. Strategic direction must be confirmed before construction starts. If anything is ambiguous: **ask, don't assume.**

### Requires alignment
- Interpretation of product intent (what the user actually wants)
- Scope framing (which concerns are in or out)
- Target shape (CLI vs filesystem vs UI, audience, data source)
- Any ambiguous term or directive in the request
- Approach choice when multiple reasonable interpretations exist
- Non-trivial rewrites of existing artifacts

### Does NOT require alignment (execute autonomously)
- Tactical implementation inside an aligned plan
- Routine sequencing (test order, subagent dispatch order)
- File-level naming, refactor shape, test organization
- Small cleanups inside the original mission
- Tactical tooling — install method (npm/scoop/binary), package manager flavor, CLI distribution source, version pinning. Pick the official/best option and proceed.

### Flow
1. Restate user intent in one sentence and propose a direction.
2. `AskUserQuestion` with 2-4 concrete options, recommendation marked, reasoning.
3. Wait for confirmation — no files written, no subagents launched, no implementation.
4. Once aligned, execute autonomously for tactical moves.
5. If new ambiguity surfaces mid-task or scope creeps, stop and re-confirm.

## Rule 2 — AskUserQuestion Format

Every `AskUserQuestion` call MUST include:

1. **2-4 concrete options** — not open-ended prompts (the tool auto-adds "Other").
2. **A recommendation** — first option, labeled `(Recommended)`.
3. **The "why"** — short rationale for the recommendation and the trade-off against alternatives.

Each option needs a **description** explaining the meaning or trade-off. Use `multiSelect: true` only when choices are genuinely non-exclusive. Use `preview` for visual comparisons (mockups, layouts). Batch 2+ related questions into one call (max 4).

### Forbidden
- Open-ended "what do you think?" / "what would you like?"
- Options without a recommendation
- Recommendation without reasoning
- Questions buried in plain-text output instead of the tool

### Good pattern
> Which approach for X? **Recommended: Option A** — fastest, matches existing pattern in file Y. Option B trades speed for flexibility. Option C only makes sense if Z.

## Exceptions

None during active tasks. If the user says "just pick one and go" for a given task, respect that for that task's scope only.
