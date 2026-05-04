# How to cut a release

## What this file is for

Documents the automated release flow driven by release-please, what to do when it breaks,
and the manual override procedure of last resort.

## When to update it

When the release workflow (`release.yml`) changes, when the release-please config or
manifest location changes, or when the Conventional Commits convention is extended or
restricted.

**Audience:** developers shipping changes to `main`

**Prerequisites:** PR is approved, CI green, commit title follows Conventional Commits

**Outcome:** `main` has a new tag, `CHANGELOG.md` updated, GitHub Release published

---

### Day-to-day flow (no manual cutting required)

Releases are fully automated. You do not manually bump versions or write changelogs.

```text
1. Write commits with Conventional Commits subject lines
        feat: add X        →  minor bump
        fix: correct Y     →  patch bump
        feat!: drop Z      →  major bump
        chore: update deps →  no release (excluded type)

2. Squash-merge your PR to main

3. release-please-action runs on push to main
        reads commits since the last release tag
        opens (or updates) a release PR with proposed CHANGELOG entries
        proposes a semver bump based on commit types

4. Review the release PR
        confirm CHANGELOG entries are accurate
        confirm proposed version bump is correct

5. Merge the release PR
        release-please tags the commit (e.g. v1.2.0)
        creates a GitHub Release with the generated notes
        the post-release job updates bun.lock and commits it
```

The workflow is defined in `.github/workflows/release.yml` and configured in
`release-please-config.json`. The manifest (`.release-please-manifest.json`) tracks the
current version — do not hand-edit it.

---

### Steps when something goes wrong

**Release PR not appearing**

The workflow uses `GITHUB_TOKEN` by default. If `main` has branch protection rules that
block `GITHUB_TOKEN` from creating PRs, release-please will fail silently. Fix: create a
Personal Access Token (or GitHub App token) with `contents: write` and `pull-requests:
write`, store it as `secrets.RELEASE_PAT`, and swap the `token:` line in `release.yml`
(see the comment in that file).

**CI not running on the release PR**

`GITHUB_TOKEN` cannot trigger new workflow runs on PRs it opens (GitHub security restriction).
Solution is the same PAT/App approach described above — a PAT-opened PR will trigger CI
normally.

**CHANGELOG entry missing**

The commit subject didn't match Conventional Commits format, or used an excluded type
(`chore:`, `docs:`, `style:`, `test:` are not release triggers by default). Squash-merge
titles are the source of truth — fix the title before merging and the next push will pick
it up. You cannot retroactively add a commit to a past release PR; accept the omission
or revert and re-merge with the correct title.

---

### Manual override (last resort)

Use only if the automation is broken and a release is urgent. Document the failure first.

```bash
# 1. Confirm you are on main and it is clean
git checkout main && git pull

# 2. Bump version in package.json manually (follow semver)
# 3. Update CHANGELOG.md with the release date and entries
# 4. Commit
git add package.json CHANGELOG.md
git commit -m "chore: release vX.Y.Z (manual override — automation failure)"

# 5. Tag
git tag vX.Y.Z

# 6. Push tag (triggers GitHub Release draft if the workflow watches tags)
git push origin main --tags
```

After the manual override: open an issue describing why automation failed and fix it before
the next release.

---

### Verification

After the release PR is merged:

```bash
git fetch --tags
git tag --list | sort -V | tail -5   # new tag should appear
```

Confirm the GitHub Release is visible at:
`https://github.com/<org>/<repo>/releases`

The release notes should contain entries for every `feat:` and `fix:` commit since the
prior release tag.

---

### Troubleshooting

**Wrong version bump**

The semver bump is determined by the commit types since the last release. `feat:` = minor,
`fix:` = patch, `feat!:` or `BREAKING CHANGE:` footer = major. If the bump is wrong,
review the commits in the release PR's CHANGELOG — a `feat:` you didn't expect likely
crept in. You can edit the release PR body before merging, but the tag will still be
computed by release-please from the manifest.

**CHANGELOG entry duplicated**

release-please tracks processed commits in `.release-please-manifest.json`. Hand-editing
that file will cause duplicates or skipped versions. If the manifest is corrupt, open a
release-please issue with the repo's release-please configuration — do not patch it by
hand.

**bun.lock not updated after release**

The post-release job (`Fix stale bun.lock after release`) runs only when
`steps.release.outputs.releases_created` is truthy. If it skipped, the lock file update
did not happen — run `bun install` locally, commit the updated `bun.lock` directly to
`main` with a `chore:` commit (which will not trigger another release).

---

### See also

- ADR 008 — Conventional Commits + release-please (if present in `docs/adr/`)
- [/release-please-config.json](../../release-please-config.json)
- [/.github/workflows/release.yml](../../.github/workflows/release.yml)
- [/.release-please-manifest.json](../../.release-please-manifest.json)
- [/CONTRIBUTING.md](../../CONTRIBUTING.md)

---

_Last reviewed: 2026-04-28 — owner: TBD_
