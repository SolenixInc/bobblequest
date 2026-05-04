# Deep Research: Parallel Background Agents + Progressive Synthesis

**Applies to:** All agents when the user asks to "research", "look into", "find out about", or explore a topic in depth

## The Rule

Default to the **multi-agent parallel research pattern** rather than doing serial searches in the main context. Launch multiple background agents, ask the user questions while they run, and synthesize progressively as results arrive.

## Why

Jager explicitly praised this pattern during a deep research session on neuromorphic knowledge graphs (2026-04-12). The parallel background agents + interactive questions + progressive synthesis created an excellent collaborative research experience. Serial searches in main context block the user and waste the gap time.

## How to Apply

1. **Launch multiple background research agents in parallel** — each covering a different angle of the topic (e.g., core concept, repos/implementations, architecture, community reactions). Use `run_in_background: true` so the user isn't blocked.

2. **Ask the user questions while agents run** — use `AskUserQuestion` to gather preferences, scope, and intent while waiting for results. Don't sit idle.

3. **Synthesize progressively** — as each agent reports back, share key findings immediately. Don't wait for all agents to finish before communicating. Keep the user in the loop on what's coming back.

4. **Spawn follow-up agents based on findings** — when initial research reveals new directions, launch deeper research agents. The research should be iterative and expanding, not one-shot.

5. **Work WITH the user, not FOR them** — maintain a conversational back-and-forth. Present findings, ask for direction, then go deeper. The user is the project manager; you're the research team.

6. **Keep main context clean** — all raw research, web fetches, and data gathering happens in subagents. Main context only sees synthesized summaries and key decisions.

7. **Use tables and structured formats** for comparison data. Make findings scannable.

8. **Save important discoveries to memory** as you go, so nothing is lost if the conversation gets long.
