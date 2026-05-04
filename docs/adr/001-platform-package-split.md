---
adr: 001
status: accepted
date: 2026-04-26
last_audited: 2026-04-26
maintainer_contract: This ADR sets the organizational convention for all platform packages.
---

# 001 — Platform Package Split: Types/Browser/Native Convention

## Context

Platform capabilities are defined as clean-architecture ports. `@t/analytics` and `@t/logging` were
server-only packages (Node.js SDKs: PostHog Node, Winston). Browser surfaces need the same
conceptual ports but against browser SDKs: `posthog-js`, structured console logging.

Previously, apps/web imported `posthog-js` directly, bypassing the platform port.

## Decision

Create a three-tier package convention for all platform capabilities crossing runtime boundaries:

| Tier | Suffix | Scope | Example |
| --- | --- | --- | --- |
| **-types** | (none) | Port + types + schemas (zero runtime) | `@t/analytics-types`, `@t/logging-types` |
| **base** | (no suffix) | Server impl (Node.js SDK) | `@t/analytics`, `@t/logging` |
| **-browser** | `-browser` | Web + Electron renderer impl | `@t/analytics-browser`, `@t/logging-browser` |
| **-native** | `-native` | React Native impl (future) | `@t/analytics-native` |

## Consequences

### Positive

- Unified conceptual model across runtimes
- Sealed port contract — swapping SDKs requires one change
- Isomorphic schemas and logic
- Extensible without breaking existing packages

### Negative

- Package count growth
- Port contract is permanent
- DI boilerplate

## Worked Example

**Before**: `packages/analytics/` server impl only. apps/web imports `posthog-js` directly.

**After**:

- `packages/analytics-types/` — port + types + schemas
- `packages/analytics/` — refactored to re-export `-types`
- `packages/analytics-browser/` — browser impl

Same port API, different impl per platform.

## Related

- [docs/architecture/platform/analytics.md](../architecture/platform/analytics.md)
- [docs/architecture/platform/logging.md](../architecture/platform/logging.md)
- [docs/prd-status/packages/](../prd-status/packages/)
