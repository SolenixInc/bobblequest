# Type Safety

## Forbidden Constructs

| Construct | Language | Use Instead |
|-----------|----------|-------------|
| `any` | TypeScript | `unknown` + type guards or Zod schemas |
| `dynamic` | Dart | `Object?` + `is` checks |
| Type assertions (`as`, `<Type>`) | TypeScript | Schema parsing or type guards |
| Unsafe casts (`as`) | Dart | `is` check before access |
| Non-null assertion (`!`) | Both | Optional chaining (`?.`) or explicit null checks |
| `@ts-ignore` / `@ts-expect-error` | TypeScript | Fix the type error |

**No exceptions.** These rules apply to production code, test code, and utility code equally.

## Parse, Don't Validate

- External data (API responses, user input, config, DB results) must be **parsed** through a schema, not assumed to match a type.
- Use Zod (TypeScript) or equivalent validation at system boundaries.
- Once parsed, the data carries its type proof — no further assertions needed.

## Practical Guidance

- Wrap third-party libraries that return `any`/`dynamic` at the integration boundary — parse into a typed result immediately.
- Use generics over `any` when building reusable utilities.
- Prefer `unknown` for truly unknown data — it forces you to narrow before use.
