# Testing Strategies

## Test Pyramid

- **Unit tests** (majority): Fast, isolated, all external dependencies mocked.
- **Integration tests** (critical paths): NO mocking — real infrastructure, real databases.
- Unit tests run in milliseconds. If a unit test is slow, it's probably an integration test.

## Mandatory Scenario Coverage

Every test suite must include all three scenario types:

| Prefix | What | Example |
|--------|------|---------|
| `[SUCCESS]` | Happy path | Valid input produces expected output |
| `[ERROR]` | Failure modes | Invalid input, missing data, permission denied |
| `[EDGE]` | Boundary cases | Empty arrays, null values, max limits |

## Test Organization

- Unit tests mirror the source directory structure.
- Test file lives alongside or mirrors the source file path.
- Descriptive, behavior-focused test names — test WHAT it does, not HOW.

## Rules

- 100% test coverage required. No exceptions, no "we'll add tests later."
- Never lower coverage thresholds to pass CI.
- Integration tests must only run via the project's designated test command (not raw test runners).
- Reset all mocks between tests — never rely on test ordering.
