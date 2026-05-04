# Interrogate Intent — Don't Just Confirm Scope

**Applies to:** All agents, every non-trivial task, especially work resumed from handoffs, prior sessions, or existing artifacts

## The Rule

Before any substantive work — and **especially** before dispatching subagents to write content — interrogate the user's intent at the level of **purpose**, not just scope. Confirm:

1. **What is this artifact FOR?** (the use case, the problem it solves)
2. **Who reads / runs it?** (the audience and their context)
3. **What should it explicitly NOT contain?** (the negative space — content that would be technically on-topic but wrong for this purpose)
4. **What's the smallest version that delivers the value?** (avoids drift into adjacent territory)

Surface answers via `AskUserQuestion` with concrete option previews showing the **shape** of the output, not just its scope. A scope question ("which sub-skills?") doesn't catch purpose drift; a shape question ("playbook of agentic tricks vs. SDK theory vs. flat list") does.

### Inherited-framing trap

When a task arrives via handoff, prior conversation, or existing artifact (v1 file, draft, plan doc), the framing is **inherited, not validated**. Do not treat it as truth. The prior session's framing may have been wrong — that's often why the user is back. Re-interrogate before continuing.

Specifically:
- Read the existing artifact, then ask: is this the right shape, or did it drift?
- A handoff that says "agents B and C still need to do X" is a status report, not a license. The premise X may itself be wrong.
- Subagent briefs based on inherited framing propagate the drift across every file they touch.

## Why

Reusing prior framing without validating it against actual user intent causes systematic drift. A scope-level alignment question ("which sub-skills?") doesn't catch that the whole direction is wrong — only purpose-level interrogation does. Cost of one extra purpose question: seconds. Cost of recovering from inherited-framing drift: a full rewrite.