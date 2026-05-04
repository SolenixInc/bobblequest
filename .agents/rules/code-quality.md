# Code Quality

## Complexity Thresholds

| Metric | Good | Moderate | Bad | Very Bad |
|--------|------|----------|-----|----------|
| Cyclomatic complexity | <= 10 | 11-20 | 21-50 | > 50 |
| Maintainability index | >= 80 | 65-79 | < 65 | — |

Thresholds are quality gates — **never adjust them to pass failing checks.** Fix the code.

## Refactoring Strategies

When complexity exceeds thresholds:

1. **Function extraction** — Break large functions into named, single-purpose helpers.
2. **Early returns / guard clauses** — Replace nested `if/else` chains with early exits.
3. **Strategy pattern** — Replace complex conditionals (`switch` with 5+ cases, nested ternaries) with a strategy map or polymorphism.

## General Quality Rules

- Prefer pure functions over stateful methods where possible.
- Keep function signatures to 3-4 parameters max — use an options/config object beyond that.
- Render error states with higher priority than loading states in UI code.
- Clean up all disposable resources (event listeners, subscriptions, timers).
