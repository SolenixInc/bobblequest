# Single Responsibility Principle

## Zero Tolerance: One Primary Declaration Per File

Every file contains exactly **one** primary declaration:

- One class, OR
- One function, OR
- One interface/type, OR
- One constant, OR
- One schema (+ its inferred type is allowed alongside)

**Exception (Flutter/Dart):** A `StatefulWidget` + its `State` class may coexist.

## Enforcement

- PRs MUST reject files containing multiple primary declarations immediately.
- No negotiation, no "it's small enough to keep together."

## Where to Extract

| What | Where |
|------|-------|
| Helper functions | `utils/` directory |
| Type definitions | `types/` directory |
| Constants | `constants/` directory |
| Shared schemas | `entities/` layer |

## Why

- One-declaration files are trivially testable, reviewable, and replaceable.
- Merge conflicts drop to near-zero when files have single owners.
- Code search becomes file search — the file name IS the declaration name.
