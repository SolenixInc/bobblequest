# Operations: release process

## What this file is for

Describes how versions are bumped, how GitHub Releases are created, and how mobile, desktop, and
hotfix releases are handled. Pairs with `/docs/how-to/cut-a-release.md` for step-by-step
instructions.

## When to update it

Update whenever the release automation changes (workflow file, release-please config, EAS config),
when a new platform is added, or when the versioning policy shifts.

---

## Versioning policy

This repo uses a single root version driven by Conventional Commits. The root package at `.` is the
release unit; all workspace packages track it via the `node-workspace` plugin.

**Pre-1.0 (`0.x.y`) — current default:**

| Commit type | Bump |
| --- | --- |
| `feat:` | minor (`0.x+1.0`) |
| `fix:` | patch (`0.x.y+1`) |
| `feat!:` / `BREAKING CHANGE:` | minor (no major bump pre-1.0) |

**Post-1.0:**

| Commit type | Bump |
| --- | --- |
| `feat:` | minor (`x.y+1.0`) |
| `fix:` | patch (`x.y.z+1`) |
| `feat!:` / `BREAKING CHANGE:` | major (`x+1.0.0`) |

Config source: `/release-please-config.json` — `bump-minor-pre-major: true`,
`bump-patch-for-minor-pre-major: true`. Release type: `node`. Plugin: `node-workspace`.

---

## Release flow (root version)

See `/docs/how-to/cut-a-release.md` for the step-by-step checklist.

1. **Conventional commit on PR.** All PR titles and squash-merge commit messages must follow the
   Conventional Commits spec (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
2. **Squash-merge to `main`.** Feature branches are squash-merged; the resulting commit message is
   what release-please reads.
3. **release-please opens a release PR.** On every push to `main`, the `release` GitHub Actions
   workflow runs `googleapis/release-please-action@v5`. If releasable commits are present,
   release-please opens or updates a release PR that contains the proposed CHANGELOG entry and the
   version bump in `package.json` and `.release-please-manifest.json`.
4. **Review and merge the release PR.** The release PR is a normal PR — review it, edit the
   CHANGELOG
   if needed, then merge.
5. **Tag and GitHub Release created automatically.** Merging the release PR triggers another
   release-please run that creates the git tag and the GitHub Release. A follow-up step in the
   workflow refreshes `bun.lock` and commits it if changed.

Workflow file: `/.github/workflows/release.yml`. Pinned action:
`googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7` (v5.0.0).

---

## Mobile releases (EAS)

Mobile releases are separate from the root release and are not automated by release-please.

Build:

```bash
bunx eas build --platform ios
bunx eas build --platform android
```

Submit:

```bash
bunx eas submit --platform ios
bunx eas submit --platform android
```

Versioning: `app.json` `version` field aligns manually to the root version after a root release is
cut. `<TBD>` — exact commands and profiles will be documented once the EAS configuration lands in
`apps/mobile/eas.json`.

---

## Desktop releases

- Builder: `<TBD-builder>` (Electron packager / builder not yet configured)
- Auto-update: `<TBD-mechanism>` (e.g., electron-updater + S3, or GitHub Releases as the update
  source)
- Versioning: aligns to root version; `apps/desktop/package.json` is bumped by the `node-workspace`
  plugin when a root release is cut.

---

## Hotfixes

1. Branch from the latest release tag: `git checkout -b hotfix/<description> vX.Y.Z`.
2. Cherry-pick the fix commit(s) from `main` or write the fix directly.
3. Commit with a conventional `fix:` message.
4. Open a PR targeting `main` (not a release branch).
5. Squash-merge triggers release-please, which fast-tracks the patch bump and opens a release PR.
6. Merge the release PR to publish.

Do not bypass the release PR — it ensures the CHANGELOG stays accurate.

---

## Pre-release / staging cuts

Optional `*-rc.N` tags can be created manually from `main` for staging validation:

```bash
git tag v0.5.0-rc.1
git push origin v0.5.0-rc.1
```

Pre-release automation is not currently configured. Release-please will not open a release PR for
`-rc` tags — they are informational only.

---

## Rollback

1. Revert the merge commit on `main` using a `revert:` conventional commit:

   ```bash
   git revert -m 1 <merge-sha>
   # Commit message: revert: <original subject>
   ```

2. Push to `main`. release-please does not bump the version on `revert:` commits, so no spurious
   release PR is opened.
3. Redeploy the previous tag on Railway:
   - Railway dashboard > Deployments > select the last good deployment > Redeploy, or
   - `railway up --detach` from the tagged commit locally.

---

## See also

- ADR 008 — versioning and release strategy decision record
- `/docs/how-to/cut-a-release.md` — step-by-step release checklist
- `/release-please-config.json` — release-please configuration
- `/.github/workflows/release.yml` — release GitHub Actions workflow

---

_Last reviewed: 2026-04-28 — owner: TBD_
