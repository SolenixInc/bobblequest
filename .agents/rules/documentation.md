# Documentation

## Doc Comment Requirements

All exported functions, classes, interfaces, and types MUST have doc comments (TSDoc / DartDoc).

### Required Tags

| Tag | When |
|-----|------|
| `@param` | Every parameter |
| `@returns` | Every function with a return value |
| `@throws` | Every function that can throw |
| `@example` | Encouraged for non-trivial APIs |

### Forbidden Tags

- `TODO` — use issue tracker, not code comments.
- `@author` — git blame is the source of truth.
- `@version` — versioning belongs in package metadata.

## API Documentation

For projects using OpenAPI:

- All public endpoints must have schema-driven documentation.
- Use hierarchical tags for grouping (e.g., `Users > Profile`, `Auth > Sessions`).
- Every endpoint needs a summary (3-5 words) and a description.

## General

- Document the "why" when non-obvious — the code shows the "what."
- Keep doc comments up to date when changing function signatures.
- Don't document the obvious (`/** Gets the user */ getUser()` adds nothing).
