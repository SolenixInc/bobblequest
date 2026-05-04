---
paths:
  - "package.json"
---

# Root `package.json` — `trustedDependencies` and `prepare`

**Applies to:** root `package.json` lifecycle scripts and trust list.

## Lifecycle scripts only run for trusted deps

- Bun runs postinstall scripts ONLY for the top ~500 packages by default. Every other dep with a postinstall step must be listed in root `trustedDependencies` or its lifecycle silently skips.
- Adding any native-binary dep (esbuild-style postinstall, prebuild downloads, native bindings)? Add it to `trustedDependencies` the same turn.

## Required entries (minimum)

Root `trustedDependencies` MUST include at least:

- `@biomejs/biome`
- `esbuild`
- `lefthook`

If any of these go missing, format/lint/hooks/build will silently fail post-install.

## `prepare` script

- Root `package.json` `"prepare"` MUST remain `"lefthook install"`.
- If you find it changed to `"echo skipped"`, `""`, or anything that no-ops lefthook, that is a band-aid. Underlying cause is almost always `git config --local core.hooksPath` being set (see `lefthook-and-hooks.md`). Fix the root cause; never persist the band-aid.

## Forbidden

- `ignoreScripts = true` in `bunfig.toml` — kills lifecycle for trusted deps too. See `bunfig-invariants.md`.

Reason: Verified Bun 1.3.11, RTFM-checked 2026-04-27. The trust list is the contract that keeps native binaries usable post-install.
