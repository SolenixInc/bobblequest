# 003 — Bun runtime and Turbo

## Status

Accepted

---

## Context and problem statement

This monorepo spans five apps (API, web, website, mobile, desktop) and several shared packages — all
TypeScript. The developer experience
cost of the traditional Node + npm/pnpm toolchain compounds quickly in a monorepo: slow installs,
slow test runs, multiple tools doing
overlapping jobs (runtime, bundler, test runner, package manager), and friction any time a developer
hops between environments.

We needed a single, consistent runtime that handles installs, script execution, and tests without
relying on a separate test framework
or bundler layer, and a task runner that provides caching and parallelism across workspace tasks.

---

## Decision drivers

- Install speed: cold `node_modules` rebuild must be fast enough to not block CI
- Test speed: unit test suite must run in seconds, not minutes
- Single TS-aware runtime: one binary that installs, runs, and tests TypeScript without a separate
  `ts-node` or `tsx` shim
- Native lockfile: deterministic, diff-friendly lockfile committed to the repo
- Turbo caching: `dev`, `build`, `test`, `typecheck`, and `lint` tasks must benefit from remote and
  local caching
- Cross-platform support: Windows, macOS, Linux (dev and CI)

---

## Considered options

- Option A: Node + pnpm + Turbo
- Option B: Node + npm + Turbo
- Option C: Bun + Turbo (chosen)
- Option D: Deno

---

## Decision outcome

Chosen option: **Option C — Bun + Turbo** — Bun 1.3.11+ is the runtime and package manager;
Turborepo is the task pipeline layer.

`packageManager: "bun@1.3.11"` is set in the root `package.json`. CI runs Bun directly with no Node
fallback. All workspace scripts
(`dev`, `build`, `test`, `typecheck`, `lint`, `format`) are defined as Turbo tasks in `turbo.json`
with input hashing for cache
correctness.

---

## Consequences

### Positive

- Install times in CI are significantly faster than npm or pnpm on the same hardware
- `bun test` / Vitest over Bun is measurably faster than Jest or Vitest over Node for this repo size
- One binary handles installs, script execution, and TypeScript transpilation — fewer toolchain hops
- `bun.lock` is a plain-text lockfile; Dependabot supports `package-ecosystem: bun`
- Turbo's task graph and remote cache mean unchanged packages are skipped in CI and local dev

### Negative

- Smaller ecosystem than Node: a small number of packages assume Node-specific `Buffer`/`process`
  semantics and need case-by-case
  shims or replacements
- Bun moves fast; patch releases can introduce regressions; version is pinned to mitigate blast
  radius

### Neutral

- Lockfile is `bun.lock` (text format) — replace `package-lock.json` references in any tooling docs
  accordingly
- CI pipelines use `uses: oven-sh/setup-bun@v2` rather than `actions/setup-node`

---

## Pros and cons of the options

### Option A: Node + pnpm + Turbo

**Pros:**

- Largest ecosystem; virtually all packages assume Node
- pnpm is the most widely deployed monorepo package manager; extensive documentation and community
  tooling
- Turbo caching works identically

**Cons:**

- Requires separate `ts-node` / `tsx` shim for script execution
- Install speed is slower than Bun for large dependency trees
- Two tools (pnpm + Turbo) doing jobs Bun + Turbo also cover, with more configuration surface

---

### Option B: Node + npm + Turbo

**Pros:**

- npm ships with Node; zero additional installs
- Maximum ecosystem compatibility

**Cons:**

- Slowest installs of all options considered
- Workspace support in npm is functional but less ergonomic than pnpm or Bun
- No native TypeScript execution; same shim requirement as Option A

---

### Option C: Bun + Turbo (chosen)

**Pros:**

- Fastest installs and test runs in benchmarks
- Native TypeScript execution — no shims
- Single binary for install + run + test
- `bun.lock` is text; Dependabot-compatible

**Cons:**

- Smaller community than Node ecosystem
- Some npm packages require patching for Node API compatibility (mitigated case-by-case)
- Bun minor releases may break things; version pinning is mandatory

---

### Option D: Deno

**Pros:**

- Built-in TypeScript, permissions model, URL imports

**Cons:**

- npm compatibility layer is improving but not at parity
- Monorepo tooling is immature relative to Bun workspaces + Turbo
- Import-map / URL-import model does not align with the existing npm-registry dependency graph

---

## Links

- Conventions: /CONVENTIONS.md
- Onboarding: /docs/onboarding.md
- Root package.json: /package.json

---

_Last reviewed: 2026-04-28 — owner: TBD_
