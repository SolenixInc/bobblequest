# Running & Promoting Evals

## Prerequisites

Behavioral evals run against the compiled binary. You **must** build and bundle
the project first after making changes:

```bash
npm run build && npm run bundle
```

---

## Running Tests

### 1. Configure Environment Variables

Evals require a standard API key. If your `.env` file has multiple keys or
comments, use this precise extraction setup:

```bash
export API_KEY=$(grep '^API_KEY=' .env | cut -d '=' -f2) && RUN_EVALS=1 npx vitest run --config evals/vitest.config.ts <file_name>
```

Adjust the `API_KEY` variable name to match your project's convention (e.g.,
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).

### 2. Commands

| Command                             | Scope           | Description                                        |
| :---------------------------------- | :-------------- | :------------------------------------------------- |
| `npm run test:always_passing_evals` | `ALWAYS_PASSES` | Fast feedback, runs in CI.                         |
| `npm run test:all_evals`            | All             | Runs nightly incubation tests. Sets `RUN_EVALS=1`. |

### Target Specific File

_Note: `RUN_EVALS=1` is required for incubated (`USUALLY_PASSES`) tests._

```bash
RUN_EVALS=1 npx vitest run --config evals/vitest.config.ts my_feature.eval.ts
```

---

## Debugging and Logs

If a test fails, verify:

- **Tool Trajectory Logs**: Sequence of calls in `evals/logs/<test_name>.log`.
- **Verbose Reasoning**: Capture raw buffer traces by setting a debug log
  environment variable:
  ```bash
  export DEBUG_LOG_FILE="debug.log"
  ```

---

### Verify Model Targeting

- **Tip:** Standard evals benchmark against model variations. If a test passes
  on one model variant but fails on another, the issue is usually in the **tool
  description**, not the prompt definition. Smaller/faster models are sensitive
  to "instruction bloat," while larger models are sensitive to "ambiguous
  intent."

---

## Deflaking & Promotion

To maintain CI stability, all new evals follow a strict incubation period.

### 1. Incubation (`USUALLY_PASSES`)

New tests must be created with the `USUALLY_PASSES` policy.

```typescript
evalTest('USUALLY_PASSES', { ... })
```

They run in nightly workflows and do not block PR merges.

### 2. Investigate Failures

If a nightly eval regresses, follow the investigation steps in
[fixing.md](fixing.md).

### 3. Promotion (`ALWAYS_PASSES`)

Once a test scores 100% consistency over multiple nightly cycles, follow the
promotion steps in [promoting.md](promoting.md).

_Do not promote manually._ Verify trajectory logs before updating the file
policy.
