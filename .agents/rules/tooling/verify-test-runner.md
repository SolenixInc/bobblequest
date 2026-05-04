# Verify Test Runner Before Running Tests

**Applies to:** All agents running or verifying tests

## The Rule

Before invoking any test command, read the project's `"scripts.test"` from `package.json` (or equivalent for non-JS stacks). **Never assume the runner from the package manager.**

```
grep '"test"' package.json
```

If the script delegates (`"bun run test"`, `"bunx turbo run test"`, `"npm test"`), follow the chain to the actual runner (vitest, jest, node:test, pytest, etc.) before running anything.

## Why

Package manager ≠ test runner. A Bun-managed project might use vitest. A npm-managed project might use jest or mocha. Running the manager's native runner (`bun test <file>`, `npm test <file>`) against a differently-configured project fails in ways that look like real defects but are tooling mismatches — e.g. `"better-sqlite3 is not yet supported in Bun"` when `bun test` tries to load native bindings the project actually executes through vitest.

When verifying a subagent/worker's claimed test pass, use the **same runner they used**. Always check `package.json` first.

## How to Apply

1. Read `package.json` → `"scripts.test"`.
2. Trace delegations. Root `"bunx turbo run test"` → per-workspace script → actual runner.
3. Invoke the resolved runner directly with the target file + absolute root path.
4. Common resolutions:
   - Vitest: `bunx vitest run --root <absolute-path> <relative-test>`
   - Jest: `bunx jest --rootDir <absolute-path> <test>`
   - Pytest: `pytest <path>` with appropriate venv activation
