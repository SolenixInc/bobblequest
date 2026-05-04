# ASCII Art for Status / Overview / Architecture Communication

**Applies to:** All agents communicating status, architecture, or multi-phase plans to the user

## The Rule

Default to ASCII-art diagrams (boxes, arrows, progress bars, side-by-side before/after, layered phase grids) — not just tables — when communicating:

- Project/epic status overviews
- Before → After architecture
- Multi-phase plans with progress visualization
- Migration flows / data pipelines
- Anywhere state is complex and a table alone would flatten the structure

## Why

Plain tables flatten spatial relationships; ASCII art preserves flow, hierarchy, and timelines. When communicating complex state — multi-phase migrations, architecture transitions, sprint overviews, or dependency chains — the spatial arrangement of information carries meaning. Box-drawing characters, arrows, and progress bars make structure legible at a glance in a way that a grid of cells cannot. This approach is standard in developer-facing tooling (Anthropic, Vercel, Railway, GitHub) when communicating anything beyond simple key-value lookups.

Confirmed twice by the user, both unprompted:

1. **2026 — NutraForge Railway migration overview** — _"wow holy shit this is so cool do more of this this is amazing for understanding or you communicating to me whats going on effectively."_ Full ASCII with before/after boxes, phase grid + `██░░` progress bars, secrets pipeline diagram, decisions + follow-ups panels.
2. **2026-04-19 — Platform repo + ClickUp state-of-the-union overview** — _"asci art is amazing btw do more of that add that to your system instructions some how."_ Full ASCII with git-state boxes, commit timeline, epic tree with progress bars, dependency-flow diagram, and a done/in-flight/planned three-column grid.

Two independent confirmations = durable user preference, not a one-off.

## How to Apply

- Default to ASCII art for any "give me an overview / where are we at / explain the architecture" style question when there's real structure to show.
- Use `╔══╗` `┌──┐` `├──┤` box-drawing chars, arrows (`→ ◄── ▼`), progress bars (`██████░░░░`), and section headers with rule lines.
- Label every region. Don't just draw shapes — annotate them.
- Keep it information-dense. The art is the explanation, not decoration.
- A plain table is fine for simple 2-column lookups; reserve ASCII art for cases where spatial relationships carry meaning (flow, hierarchy, before/after, timelines).
- Don't force ASCII art on trivial status ("task X is done") — it should earn its space.