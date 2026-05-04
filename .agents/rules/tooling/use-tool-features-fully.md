# Use All Available Tool Features — Don't Underutilize

**Applies to:** All agents using any tool or format with optional features

## The Rule

Use all available features of every tool — don't underutilize them. When a tool or format supports optional features (frontmatter fields, flags, conditional loading, schema extensions, etc.), **default to using them** rather than the minimum-viable form.

## Why

Optional features exist because they solve real problems. Ignoring them leaves free capability on the table: conditional loading reduces token cost, structured output flags reduce parsing errors, preview fields reduce round trips. The minimum-viable form is never the maximum-value form.

## How to Apply

- When a tool or format supports optional features (frontmatter fields, flags, conditional loading, schema extensions, etc.), default to using them rather than the minimum-viable form.
- Examples:
  - Use `paths:` frontmatter in rule files for conditional loading.
  - Use `preview` on `AskUserQuestion` when comparing visuals.
  - Use structured output flags on CLI commands (`--json`, `--porcelain`, `--color=never`).
- If unsure whether a feature applies, lean toward using it.
