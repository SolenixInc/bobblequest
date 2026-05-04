# How to add a platform package

## What this file is for

Step-by-step index for adding a new cross-cutting concern package (cache, queue, billing,
feature flags, etc.) under `packages/<name>/`. Each step below links to the corresponding
phase document from the canonical analytics walkthrough — the analytics package was built
following these exact phases and serves as the living reference implementation.

## When to update it

When the phase sequence changes, when new mandatory steps are added (e.g., a required ADR
phase), or when the toolchain (Bun, Turbo, DI container) changes in a way that affects the
scaffold process.

**Audience:** developers adding a new cross-cutting concern (cache, queue, billing, etc.)

**Prerequisites:** familiarity with ports/impls/registrars
(see /docs/explanation/architecture-overview.md)

**Outcome:** a new package under `packages/<name>/` with port, impl, DI registrar, tests,
README, and a phase trail

---

### Steps

#### 1. Skeleton

Create the package directory, `package.json`, `tsconfig.json`, `src/index.ts`, and wire
the package into the Turbo workspace so other packages can depend on it.

Full detail:
[phase-01-package-skeleton.md](../architecture/platform/analytics/phase-01-package-skeleton.md)

#### 2. Types and schemas

Define the domain types (event shapes, config value objects, branded IDs) that the port
and implementations will share. Keep types in `src/entities/` and export them from
`src/index.ts`.

Full detail:
[phase-02-types-and-schemas.md](../architecture/platform/analytics/phase-02-types-and-schemas.md)

#### 3. Port definitions

Write the abstract port interface(s) in `src/entities/ports/`. Ports are pure TypeScript
interfaces with no runtime dependencies — they express what the package does, not how.

Full detail:
[phase-03-port-definitions.md](../architecture/platform/analytics/phase-03-port-definitions.md)

#### 4. Config schema

Add a Zod schema under `packages/config/` that validates all env vars this package needs
at boot time. The schema hard-fails on missing required vars — no silent NoOp fallbacks.

Full detail:
[phase-04-config-schema.md](../architecture/platform/analytics/phase-04-config-schema.md)

#### 5. Implementations

Write the concrete implementations in `src/infrastructure/`: one real provider impl and
one `NoOp` impl for environments where the concern is disabled. Both must satisfy the port
interface.

Full detail:
[phase-05-implementations.md](../architecture/platform/analytics/phase-05-implementations.md)

#### 6. DI registrar

Create a `registerXxxDI()` function in `src/dependency-injection/` that wires the correct
impl into the shared DI container based on config. Call it from the application
composition root.

Full detail: [phase-06-di-registrar.md](../architecture/platform/analytics/phase-06-di-registrar.md)

#### 7. Tests

Write Vitest unit tests for the port contract, the NoOp impl, and the real impl (mocking
the external SDK). Target meaningful coverage of the public surface, not just line counts.

Full detail: [phase-07-tests.md](../architecture/platform/analytics/phase-07-tests.md)

#### 8. README and handoff

Write `packages/<name>/README.md` covering: purpose, env vars, usage example, and
contributor notes. Update the prd-status matrix to reflect the new package state.

Full detail:
[phase-08-readme-and-handoff.md](../architecture/platform/analytics/phase-08-readme-and-handoff.md)

---

### Verification

Run the following before considering the package done:

```bash
bunx turbo typecheck --filter=@t/<your-package>
bunx turbo test --filter=@t/<your-package>
```

Additional gates:

- Package is imported and consumed by at least one app (not just exported)
- The prd-status matrix in `docs/prd-status/packages/<name>.md` is updated
- An ADR is added under `docs/adr/` if the package introduces an architectural decision
  (new external vendor, new DI pattern, new data-flow concern)

---

### Troubleshooting

**DI container can't find my impl**
Check the registrar import order in `buildContainer()` in the app's composition root.
Registrars must be called before any code that resolves their tokens.

**Circular dependency error**
The port interface must not import from `src/infrastructure/`. Ports live in
`src/entities/ports/` and depend only on domain types. If you see a cycle, the import
is flowing the wrong direction — move the shared type up to `src/entities/`.

**Type errors after adding config schema**
Run `bunx turbo typecheck --filter=@t/config` first. The config package generates inferred
types from Zod schemas; downstream packages inherit type errors from there.

---

### See also

- [/docs/architecture/platform/analytics/](../architecture/platform/analytics/) —
  canonical phase-by-phase example (the analytics package)
- [/docs/adr/001-platform-package-split.md](../adr/001-platform-package-split.md)
- [/docs/explanation/architecture-overview.md](../explanation/architecture-overview.md)

---

_Last reviewed: 2026-04-28 — owner: TBD_
