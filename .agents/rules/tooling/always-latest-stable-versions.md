---
paths:
  - "**/docker-compose.yml"
  - "**/Dockerfile*"
  - "**/package.json"
  - "**/*.lock"
  - "**/pyproject.toml"
  - "**/requirements.txt"
  - "**/Gemfile"
  - "**/go.mod"
  - "**/Cargo.toml"
---

# Always Latest Stable Versions

**Applies to:** All dependency/source version references in config files

## The Rule

Always use **latest stable release** versions of all software, packages, SDKs, and container images. Never use rolling tags, `latest`, `main-latest`, or unversioned references.

## What to Use

| Type | Good | Bad |
|------|--------|-------|
| Docker images | `ghcr.io/org/repo:v1.2.3-stable` | `ghcr.io/org/repo:main-latest` |
| Docker images | `ghcr.io/org/repo:latest` (if it points to latest stable) | `ghcr.io/org/repo:rolling` |
| npm packages | `*` or `latest` in package.json | `1.2.3` (pinned old version) |
| Python packages | `>=0.0.0` or unpinned | `package==1.2.3` (pinned old version) |
| Go modules | `@latest` or unpinned | v0.0.0 (old version) |
| Base images | `alpine:3.20` | `alpine:latest` |

**For production/Docker images:** Pin to the latest **tagged stable release** (e.g., `v1.2.3-stable`, `v1.2.3`). Do NOT use rolling tags like `main`, `main-latest`, `latest` unless you verify it always tracks stable.

**For package managers (npm, pip, cargo, gem):** Prefer unpinned (`*`, `>=0.0.0`) or use a lockfile that tracks latest. Only pin to a specific version if the package has a known-breaking-change history.

## Why

- Rolling/unversioned tags = you have no idea what version you're running today vs yesterday
- `main-latest` Docker tags can be arbitrarily old or broken — no stability guarantee
- Known security vulnerabilities (like the LiteLLM 1.82.x auth bypass) are fixed in stable releases
- "Latest stable" gives you security patches and bug fixes automatically

## How to Find Latest Stable

- **GitHub Releases:** `https://api.github.com/repos/<owner>/<repo>/releases/latest` -> `tag_name`
- **Docker Hub:** `docker pull <image>:latest && docker inspect <image> --format '{{.Config.Labels.version}}'`
- **PyPI:** `pip index versions <package>` (latest = last in list)
- **npm:** `npm view <package> version`
- **Git tags:** Check for `v*.*.*` tagged releases, prefer ones with `-stable` suffix

## Verification

Before any `docker compose up`, `docker build`, or committing dependency changes:
1. Check the referenced version/tag
2. Compare against latest stable release
3. Update if behind by >1 minor version
