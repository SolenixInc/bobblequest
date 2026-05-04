# Error Handling

## Core Principle: Throw, Don't Return

- Internal code throws exceptions/errors — never returns error objects or result wrappers.
- Only catch errors if you can **handle** them. Otherwise, let them bubble up.
- A global error handler at the boundary maps errors to HTTP status codes or user-facing messages.

## Typed Error Classes

- Use typed error classes (`NotFoundError`, `ValidationError`, `UnauthorizedError`) — never generic `Error`/`Exception`.
- All custom errors extend a common base (`AppError` / `AppException`).
- Each error class carries enough context for the global handler to produce a meaningful response.

## SRP for Error Files

- One error class per file. One error helper per file.
- Error classes live in a dedicated errors directory (`errors/`, `core/errors/`).

## Boundary Error Handling

- External HTTP calls MUST have timeouts (use `AbortController` or equivalent).
- External data MUST be validated at the boundary before entering the domain.
- Infrastructure errors are caught and re-thrown as domain-specific errors.

## Anti-Patterns

- Empty catch blocks — always handle or rethrow.
- `catch (e) { return null }` — this hides real failures.
- Logging and swallowing — if it's worth logging, it's worth propagating.
