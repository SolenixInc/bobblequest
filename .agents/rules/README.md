# Shared Rules

This directory contains standards rules distributed to all consumer repos via `@nutraforgetechnologies/platform`. Covers both coding conventions and agent operating behavior.

## Coding Conventions

| File | Description |
|------|-------------|
| `clean-architecture.md` | Feature vs Platform separation, layer hierarchy, dependency direction |
| `single-responsibility-principle.md` | One primary declaration per file — zero tolerance enforcement |
| `naming-conventions.md` | PascalCase/camelCase/kebab-case conventions, file suffixes, boolean prefixes |
| `error-handling.md` | Throw don't return, typed error classes, boundary error handling |
| `type-safety.md` | No `any`/`dynamic`, no type assertions, parse don't validate |
| `dependency-injection.md` | Type-safe DI, scope separation (request vs singleton), config access |
| `import-rules.md` | No relative cross-feature imports, strict dependency direction |
| `code-quality.md` | Cyclomatic complexity thresholds, maintainability index, refactoring strategies |
| `testing-strategies.md` | Test pyramid, [SUCCESS]/[ERROR]/[EDGE] scenarios, 100% coverage |
| `documentation.md` | Doc comment requirements (TSDoc/DartDoc), API documentation standards |
| `infrastructure-patterns.md` | Boundary validation, structured logging, telemetry metadata |
| `project-structure.md` | Top-level project layout, feature/platform module directory conventions |

## Repo / Workspace Layout (template-repo specific)

| File | Description |
|------|-------------|
| `repo-overview.md` | Stack, apps, packages, key commands, turbo pipeline, status SoT pointers |
| `monorepo-package-layout.md` | `packages/**` file/folder convention — `src/` layout + mirrored `tests/` |
| `composition-root.md` | Per-app `buildContainer()` + registrar order; forbidden `process.env` outside `@t/config` |
| `testing-runner.md` | Vitest only — `bun:test` and `bunfig.toml [test]` block forbidden |

## Agent Behavior

| File | Description |
|------|-------------|
| `delegate-vs-main-context.md` | Decision framework for delegating to subagents; skilled-work pattern; structured returns; always-background; verify-don't-trust |

### Pre-Task

| File | Description |
|------|-------------|
| `pre-task/auto-plan-mode.md` | Triggers that auto-enter plan mode before substantive work |
| `pre-task/pre-execution-alignment.md` | Align on intent before building; AskUserQuestion format (2-4 options + recommendation + rationale) |
| `pre-task/interrogate-intent.md` | Confirm purpose, audience, negative space, smallest valuable shape — not just scope |
| `pre-task/deep-research-parallel-agents.md` | Launch parallel background research agents + progressive synthesis pattern |
| `pre-task/skill-security.md` | Verify skill source authenticity, install counts, audit status before installing |

### Execution

| File | Description |
|------|-------------|
| `execution/tdd-first.md` | Red → Green → Refactor; tests as executable success criteria |
| `execution/fix-active-bugs-immediately.md` | Treat every warning/error as a first-class work item; no "known/env-only/out-of-scope" labels |
| `execution/bulk-file-work-always-subagent.md` | 3+ file Write/Edit batches OR heavy-skill 1-2-use work always goes to a subagent |
| `execution/parallel-chunks-over-monolith.md` | N > ~50 bulk operations split into 3-6 parallel background workers |
| `execution/use-todos-proactively.md` | TaskCreate/Update/List for any 2+ step task; mark in-progress/completed live |

### Post-Task

| File | Description |
|------|-------------|
| `post-task/task-completion.md` | Documentation pass before declaring non-trivial work done (AGENTS / README / CONTRIBUTING / handoff / memory) |
| `post-task/handoff-include-full-filepath.md` | Always include the full absolute filepath when creating or referencing a handoff |

### Communication

| File | Description |
|------|-------------|
| `communication/ascii-art-for-overviews.md` | Default to ASCII-art diagrams for status/architecture/multi-phase plan overviews; tables flatten spatial structure |
| `communication/always-surface-industry-standard.md` | Every recommendation states the industry standard, even when recommending deviation |

### Integrations — ClickUp

| File | Description |
|------|-------------|
| `integrations/clickup/epic-close.md` | Never close epics with open subtasks — fetch + verify before close |
| `integrations/clickup/live-updates.md` | Live update cadence: start, each checklist item, decisions, blockers, PR link, done |
| `integrations/clickup/clickup-repo-field-empty-vs-none.md` | Repository field — empty (uncategorized) vs "None" (intentionally not repo-related) |
| `integrations/clickup/epic-subtask-pattern.md` | Epics are the primary tracked unit; subtasks only for genuinely isolated work |

## Tooling

| File | Description |
|------|-------------|
| `tooling/verify-test-runner.md` | Read `package.json` → `scripts.test` before invoking; never assume runner from package manager |
| `tooling/ast-grep-first-grep-fallback.md` | ast-grep first for code search; Grep only for comments/strings/non-code |
| `tooling/always-latest-stable-versions.md` | Always pin to latest stable; never rolling tags / `latest` for production images |
| `tooling/use-tool-features-fully.md` | Default to using all available optional features (frontmatter fields, structured-output flags, etc.) |

### Tooling — Bun / Lefthook / Host

| File | Description |
|------|-------------|
| `tooling/bun/bunfig-invariants.md` | Required `linker = "hoisted"`, text lockfile, Windows concurrency cap; forbidden CI-only keys; schema discipline |
| `tooling/bun/trusted-dependencies.md` | Required `trustedDependencies` entries (biome/esbuild/lefthook); `prepare = "lefthook install"` invariant |
| `tooling/bun/lefthook-and-hooks.md` | `core.hooksPath` must be unset; pre-commit + commit-msg hooks mandatory; no `--no-verify` / `LEFTHOOK_EXCLUDE` |
| `tooling/bun/windows-onedrive-host.md` | Windows + OneDrive contributor gotchas; copyfile/EPERM/EBUSY mitigation; gitignored install logs |
| `tooling/bun/install-failure-triage.md` | Six-step diagnostic order for `bun install` failures; hard prohibitions on common bad workarounds |

## Adding New Rules

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for instructions on adding new rules.
