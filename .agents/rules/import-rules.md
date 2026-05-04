# Import Rules

## No Relative Cross-Feature Imports

- Relative imports (`../`) are **forbidden** for cross-feature dependencies.
- Use path aliases or import maps: `@/features/<name>`, `@/entities/<name>`, `@/platform/<name>`.
- Relative imports are allowed ONLY within the same module/feature for internal files.

## Dependency Direction

```
entities → (nothing outside entities)
features → entities, platform
platform → (nothing from features)
delivery → applications, entities
infrastructure → entities, ports
```

- **Entities import only other entities.** No feature code, no platform code.
- **Platform never imports features.** This is the same rule from clean-architecture — import maps enforce it.

## Import Map Maintenance

- When adding a new feature or entity, update the project's import map (`deno.json`, `tsconfig.json` paths, or `package.json` imports).
- Barrel files (`index.ts`) define the public API of each module — import from the barrel, not from internal paths.

## Anti-Patterns

- `../../../features/users/infrastructure/userRepo.ts` — use `@/features/users` instead.
- Importing from a feature's internal directory instead of its barrel export.
- Circular imports between features — extract shared types to entities.
