# Infrastructure Patterns

## Boundary Validation

All data crossing from infrastructure to application layers MUST be validated:

- Use schema validation (Zod, freezed, or equivalent) on all data returned from databases, external APIs, and file systems.
- Never trust raw data from external sources — parse it into typed domain objects at the boundary.

## Logging & Telemetry

- All repository and service methods MUST accept a logger parameter.
- Every operation must log with structured metadata:

| Field | Purpose |
|-------|---------|
| `fileName` | Source file for traceability |
| `userId` / `orgId` | Who triggered the operation |
| `entityId` | What entity was affected |
| `intent` | What the operation is trying to do |
| `args` | Input parameters (sanitized) |
| `error` | Error context on failure |

- Sanitize PII and secrets before logging — never log tokens, passwords, or full request bodies.
- Use request-scoped correlation IDs for tracing across service boundaries.

## Safety

- Validate denominators before division (prevent division-by-zero).
- External HTTP calls MUST have timeouts.
- Don't log large objects (arrays, full documents) — log counts and IDs instead.
