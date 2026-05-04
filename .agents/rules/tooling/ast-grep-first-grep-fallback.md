# ast-grep First, Grep as Fallback for Code Search

**Applies to:** All agents searching codebases

## The Rule

Always use **ast-grep FIRST** for code searches. Only fall back to Grep/text search when ast-grep cannot express the query.

## Why

User views built-in Grep/Glob as "primitive tooling" compared to LLM-optimized AST-based search. ast-grep understands code structure (functions, classes, patterns) while Grep only matches text — the structural tool should be the default, not the fallback.

## How to Apply

- When searching codebases for code patterns, use the ast-grep MCP tools (`find_code`, `find_code_by_rule`, `dump_syntax_tree`, `test_match_code_rule`) as native tool calls.
- If MCP is unavailable, fall back to ast-grep CLI via Bash.
- Only fall back to Grep for:
  - Comments / strings
  - Non-code files
  - Simple literal text lookups
  - When ast-grep fails on unsupported syntax
