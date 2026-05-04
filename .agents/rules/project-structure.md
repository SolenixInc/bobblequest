# Project Structure

## Top-Level Organization

Every project separates concerns at the root level:

```
src/
├── features/           # Business logic — one directory per domain feature
├── platform/           # Technical capabilities — horizontal modules (logging, config, auth, etc.)
├── entities/           # Shared domain types and schemas (optional — can live inside features)
└── [framework entry]   # App bootstrap, server setup, DI wiring
tests/
├── unit/               # Mirrors src/ structure, all dependencies mocked
└── integration/        # Real infrastructure, no mocking
```

- `features/` and `platform/` are the two top-level groupings. Everything fits in one or the other.
- Features contain business logic. Platform contains technical capabilities. They never mix.
- Tests live outside `src/` in a parallel structure, not co-located with source files.

## Feature Directory Structure

Each feature follows the same internal layout, regardless of language or framework:

```
features/<feature-name>/
├── entities/           # Domain types, interfaces, validation schemas, ports
├── applications/       # Use cases and business logic orchestration
├── delivery/           # Controllers, handlers, routes, UI components — thin layer
│   └── <action-name>/  # One directory per endpoint/action (kebab-case)
├── infrastructure/     # Concrete implementations (DB repos, HTTP clients, SDKs)
├── dependency-injection/  # DI registration for this feature
└── index.ts            # Public API barrel — only export what consumers need
```

- Every feature has the same shape. No feature is "special" enough to skip layers.
- If a layer is empty for a given feature, omit the directory — don't create empty folders.

## Platform Module Structure

Each platform module (horizontal capability) follows a simplified version:

```
platform/<module-name>/
├── entities/           # Types, interfaces, config schemas
├── infrastructure/     # Concrete implementations
├── dependency-injection/  # DI registration
└── index.ts            # Public API — export only types and registration functions
```

- Platform modules are simpler — no `applications/` or `delivery/` layers.
- Consumers code against the exported interfaces, never against internals.

## General Principles

- **Predictability over creativity.** Every feature looks the same. A developer finding `features/billing/` already knows the internal layout without reading a README.
- **Directories are kebab-case** when multi-word (`user-profile/`, `get-users/`).
- **One action per delivery directory.** Don't bundle multiple endpoints into one directory.
- **Barrel exports define the public API.** If it's not in the barrel, it's private to the module.
