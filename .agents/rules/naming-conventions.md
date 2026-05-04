# Naming Conventions

## Case Rules

| What | Case | Example |
|------|------|---------|
| Classes, types, interfaces, enums | PascalCase | `UserService`, `AuthConfig` |
| Functions, variables, parameters | camelCase | `getUserById`, `isActive` |
| Source code filenames | camelCase | `userService.ts`, `authConfig.ts` |
| Multi-word directories | kebab-case | `user-profile/`, `get-users/` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Non-code files | kebab-case | `api-design.md`, `error-codes.json` |

## File Suffixes

| Type | Suffix | Example |
|------|--------|---------|
| Tests | `.test.ts` / `_test.dart` | `userService.test.ts` |
| Routes | `Route.ts` | `getUsersRoute.ts` |
| Handlers | `Handler.ts` | `getUsersHandler.ts` |
| Middleware | `Middleware.ts` | `authMiddleware.ts` |

## Boolean Naming

Prefix booleans with `is`, `has`, `should`, `can`, or `will`:
- `isActive`, `hasPermission`, `shouldRetry`

## Anti-Patterns

- No `_` prefix for private members — use language-native access modifiers.
- No Hungarian notation (`strName`, `bIsActive`).
- No abbreviations unless universally understood (`id`, `url`, `db` are fine; `usr`, `cfg` are not).
