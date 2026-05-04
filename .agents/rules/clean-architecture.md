# Clean Architecture

## Feature vs Platform Separation

- **Features** (`src/features/`) contain business logic — domain rules, use cases, workflows.
- **Platform** (`src/platform/`) contains technical capabilities — logging, config, database clients, email.
- **Platform NEVER imports Features.** Features import Platform. This is absolute.

## Layer Hierarchy

Dependencies flow inward only:

```
entities (+ ports) → applications → delivery → infrastructure
```

- **Entities**: Pure data types, interfaces, validation schemas. No side effects.
- **Ports**: Abstract interfaces defining what infrastructure must provide.
- **Applications**: Use cases orchestrating business logic. No framework dependencies.
- **Delivery**: Controllers, routes, handlers — thin orchestration only.
- **Infrastructure**: Concrete implementations (DB, HTTP, external SDKs).

## No Logic Leakage

- Controllers/handlers contain zero business logic — they call applications and return responses.
- Entities are data-only — no HTTP concerns, no database concerns.
- Infrastructure has no business rules — it implements ports.
- Applications don't know about HTTP status codes or framework-specific types.

## Export Rules

- Each feature exposes a public API via barrel file (`index.ts` / barrel export).
- Internal implementation details are never exported directly.
- Entities layer is the only shareable layer between features.
