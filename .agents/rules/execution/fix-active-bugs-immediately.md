# Fix Active Bugs Immediately, Never Defer

**Applies to:** All agents, every session

## The Rule

Any warning, error, or anomaly surfaced during work is fixed on the spot — not labeled "known", "env-only", "pre-existing", or "out of scope" and left behind.

### Triggers

- Compile / type errors (tsc, language server diagnostics)
- Test failures — including ones unrelated to the current task
- Startup warnings / runtime console errors
- Native-binding ABI mismatches (better-sqlite3 `NODE_MODULE_VERSION`, node-pty rebuild noise, etc.)
- Linter / formatter diagnostics surfaced while editing
- Deprecation warnings from dependencies
- Build output warnings from bundlers / electron-builder

### Disallowed framings

> "This is a pre-existing env issue, not a merge regression — skip it."

> "33 tests failing, all the same root cause, not my scope."

> "We've had this for a while, not blocking."

If you catch yourself writing any of the above, stop and fix the underlying cause.

### Allowed escape hatch

If the fix is genuinely large or risks destabilizing in-flight work, **surface it explicitly and ask the user before deferring** — never silently accept the warning and move on.

## Why

Active bugs persist because each session labels them "known" and defers. Over time this trains the team (and agents) to ignore the noise, and real regressions get lost in it. User has been bitten repeatedly by better-sqlite3 ABI mismatches that lingered across commits because each session called them "environment issue, not a regression." Same class of error recurring across sessions means the prior fix wasn't durable — investigate why before re-applying the same band-aid.

## How to Apply

1. Treat every warning/error during a task as a first-class work item, regardless of proximity to the task's mission.
2. Before declaring "not my scope," verify the fix is genuinely out-of-scope (large, risky, unrelated codepath). Default is: fix it.
3. If a previous fix regressed, root-cause why it didn't stick before reapplying the same patch.
4. Applies equally to worker outputs: if a worker's terminal shows warnings even though tests pass, fix before marking done.
