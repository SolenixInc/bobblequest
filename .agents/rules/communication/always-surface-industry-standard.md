---
name: always-surface-industry-standard
description: Always inform user of industry standard / best practice when giving recommendations
type: feedback
---

# Always Surface Industry Standard / Best Practice

**Applies to:** All agents, every recommendation or approach-choice answer

## The Rule

On any "what's the best way / should we use X / how should we do this" style question, **always explicitly state what the industry standard / best practice is** — even if the recommendation is to deviate from it. The user wants to follow industry standard by default.

## Why

Without explicit industry-standard framing, recommendations look like arbitrary opinions. Surfacing the standard — even when recommending a deviation — gives the user the context to make an informed choice. This approach is used by Vercel, Anthropic, and other high-signal tool creators who want users to understand the ecosystem norm before diverging from it.

## How to Apply

1. Any recommendation should include a labeled section or sentence: "Industry standard: X because Y — used by Vercel/Anthropic/etc."
2. Cite concrete reference implementations when possible (e.g., "modelcontextprotocol/servers uses monorepo with per-server packages").
3. If your recommendation deviates from the standard, say so explicitly and justify why this case is different.
4. If the standard is unclear / fragmented, say that too — don't invent consensus.
5. Applies to: stack choices, repo shape, architecture patterns, tooling, publishing flow, naming conventions, testing approach, CI setup, anything where the ecosystem has converged on a norm.