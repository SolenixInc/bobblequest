---
name: async-pr-review
description: Trigger this skill when the user wants to start an asynchronous PR review, run background checks on a PR, or check the status of a previously started async PR review.
---

# Async PR Review

This skill provides a set of tools to asynchronously review a Pull Request. It will create a background job to run the project's preflight checks, execute AI-powered test plans, and perform a comprehensive code review using custom prompts.

This skill is agent-agnostic and works with any AI coding CLI that supports headless inference via a `-p` flag (e.g., `claude -p`, `gemini -p`).

## Configuration

The shell scripts use the `AI_CLI` environment variable to determine which AI CLI to invoke for headless inference. It defaults to `claude`. Override it before launching the review:

```bash
# Use Claude Code (default)
export AI_CLI=claude

# Use Gemini CLI
export AI_CLI=gemini
```

## Architecture

This skill showcases an advanced "Agentic Asynchronous Pattern":
1.  **Headless Inference**: A standard bash background job cannot perform LLM inference. To conduct AI-driven code reviews and test generation in the background, the shell script invokes the configured AI CLI headlessly using `-p`. This offloads the AI tasks to independent worker agents.
2.  **Dynamic Git Scoping**: The review scripts avoid hardcoded paths. They use `git rev-parse --show-toplevel` to automatically resolve the root of the user's current project.
3.  **Ephemeral Worktrees**: Instead of checking out branches in the user's main workspace, the skill provisions temporary git worktrees in `.agents/tmp/async-reviews/pr-<number>`. This prevents git lock conflicts and namespace pollution.
4.  **Agentic Evaluation (`check-async-review.sh`)**: The check script outputs clean JSON/text statuses for the main agent to parse. The interactive agent itself synthesizes the final assessment dynamically from the generated log files.

## Workflow

1.  **Determine Action**: Establish whether the user wants to start a new async review or check the status of an existing one.
    *   If the user says "start an async review for PR #123" or similar, proceed to **Start Review**.
    *   If the user says "check the status of my async review for PR #123" or similar, proceed to **Check Status**.

### Start Review

If the user wants to start a new async PR review:

1.  Ask the user for the PR number if they haven't provided it.
2.  Execute the `async-review.sh` script, passing the PR number as the first argument. Be sure to run it with the `is_background` flag set to true to ensure it immediately detaches.
    ```bash
    .agents/skills/async-pr-review/scripts/async-review.sh <PR_NUMBER>
    ```
3.  Inform the user that the tasks have started successfully and they can check the status later.

### Check Status

If the user wants to check the status or view the final assessment of a previously started async review:

1.  Ask the user for the PR number if they haven't provided it.
2.  Execute the `check-async-review.sh` script, passing the PR number as the first argument:
    ```bash
    .agents/skills/async-pr-review/scripts/check-async-review.sh <PR_NUMBER>
    ```
3.  **Evaluate Output**: Read the output from the script.
    *   If the output contains `STATUS: IN_PROGRESS`, tell the user which tasks are still running.
    *   If the output contains `STATUS: COMPLETE`, use your file reading tools to retrieve the contents of `final-assessment.md`, `review.md`, `pr-diff.diff`, `npm-test.log`, and `test-execution.log` files from the `LOG_DIR` specified in the output.
    *   **Final Assessment**: Read those files, synthesize their results, and give the user a concise recommendation on whether the PR builds successfully, passes tests, and if you recommend they approve it based on the review.
