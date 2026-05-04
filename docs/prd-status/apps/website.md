---
name: apps/website bootstrap status
last_audited: 2026-04-26
maintainer_contract: any agent editing apps/website/** MUST update this file and docs/prd-status/matrix.md
---

# apps/website — bootstrap wiring status

Framework: Next.js 15 App Router (marketing + MDX), Tailwind v4, React 19, Bun, port 3002.

**App status:** ✅ production-ready.

## Entry points

- `apps/website/next.config.ts` — `withMDX(nextConfig)`, `pageExtensions: ['ts','tsx','md','mdx']`,
  `reactStrictMode: true`. No `experimental`, no headers, no redirects.
- `apps/website/mdx-components.tsx` — `useMDXComponents` passthrough (no overrides yet).
- `apps/website/postcss.config.mjs` — `@tailwindcss/postcss` only.
- `apps/website/src/app/layout.tsx` — `RootLayout` with `Metadata` (title template, description);
  wraps children in `PHProvider` for PostHog analytics; imports `./globals.css`; calls
  `getWebsiteConfig()` via DI for `metadataBase`.
- `apps/website/src/app/page.tsx` — marketing landing (static RSC, hardcoded copy + two CTA links;
  `TODO` for `@nutraforgetechnologies/ai` copilot).
- `apps/website/src/app/blog/page.tsx` — SSG listing page rendering from filesystem-driven content
  collection (`getAllPosts()` from `src/content/collection.ts`).
- `apps/website/src/app/blog/[slug]/page.tsx` — SSG via `generateStaticParams` over
  filesystem-driven collection; per-post OG image generation via `ImageResponse`; JSON-LD
  `BlogPosting` schema; canonical URL from config.
- `apps/website/src/app/blog/[slug]/not-found.tsx` — per-post not-found boundary.
- `apps/website/src/app/api/health/route.ts` — `GET → Response.json({ status: 'ok' })` with
  structured logging via `@t/logging` DI.
- `apps/website/src/app/sitemap.ts` / `robots.ts` — both read `SITE_URL` from `@t/config` via
  `getWebsiteConfig()` DI.
- `apps/website/src/app/not-found.tsx` — root-level not-found boundary with PostHog exception
  capture.
- `apps/website/src/app/error.tsx` — route-level error boundary with PostHog exception capture.
- `apps/website/src/app/global-error.tsx` — root-level error boundary with PostHog exception
  capture.
- `apps/website/src/app/globals.css` — Tailwind v4 `@theme` with full Shadcn light/dark CSS variable
  set (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`,
  `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`).
- `apps/website/src/lib/composition.ts` — awilix DI container builder with `registerLoggerFactoryDI`
  + `registerLoggerDI` + `getWebsiteConfig` registration; memoized `getContainer()` singleton
  pattern.
- `apps/website/src/lib/config.ts` — wraps `getWebsiteConfig()` via DI for use in sitemap, robots,
  layout, blog/[slug]/page, api/health.
- `apps/website/src/lib/logger.ts` — resolves `LoggerFactory` via DI; wired in composition root.
- `apps/website/src/content/collection.ts` — filesystem-driven content collection: `fs.readdirSync`
  + `gray-matter` frontmatter parsing + Zod validation; exports `getAllPosts()`, `getPostBySlug()`,
  `PostMeta` type.
- Content: `apps/website/src/content/blog/hello-world.mdx`, `second-post.mdx`, `third-post.mdx` (3
  sample posts with frontmatter).
- `apps/website/instrumentation-client.ts` — initializes `posthog-js` with config from environment;
  exports `PostHogPageView` component for pageview captures.
- Type shim: `apps/website/src/types/mdx.d.ts` (declares `*.mdx` module shape).
- Components: `apps/website/src/components/ui/` — button, card, badge, navigation-menu, separator (5
  Shadcn primitives); `cn()` utility at `src/lib/utils.ts`.

## @t/* imports

- **@t/config** (`workspace:*`) — consumed in `src/lib/config.ts`, wired in composition root. Used
  by: sitemap.ts, robots.ts, layout.tsx, blog/[slug]/page.tsx, api/health/route.ts.
- **@t/logging** (`workspace:*`? — confirm actual dep declaration) — consumed in
  `src/lib/logger.ts`, wired in composition root via `registerLoggerFactoryDI` + `registerLoggerDI`.
  Used in api/health/route.ts.
- **@t/dependency-injection** — consumed in `src/lib/composition.ts`; awilix container built and
  memoized.
- **@t/analytics** — NOT wired for server-side. Client-side PostHog works via `posthog-js` directly
  (instrumentation-client.ts + PHProvider in layout.tsx). `registerAnalyticsDI` not called in
  composition root; no `src/lib/analytics.ts` convenience export.
- **@t/errors** — NOT imported. N/A: `@t/errors` `errorHandler()` targets Hono API routes; Next.js
  App Router uses error boundary pattern (`error.tsx`, `global-error.tsx`).
- **@t/auth** — N/A (marketing site, no auth target per architecture doc).

## Wiring checklist

| Concern | Status | Evidence |
| --- | --- | --- |
| Framework (Next.js 15 + React 19 + Turbopack dev) | ✅ | `package.json` pins `next ^15`, `react ^19`; `dev` script uses `--turbopack -p 3002`. |
| Tailwind v4 | ✅ | `@tailwindcss/postcss ^4` + `globals.css` `@import "tailwindcss"` with `@theme` block. |
| Config (`@t/config` → `ConfigRepository`) | ✅ | `src/lib/config.ts` wraps `getWebsiteConfig()` via DI; consumed in sitemap.ts, robots.ts, layout.tsx, blog/[slug]/page.tsx, api/health/route.ts. |
| Logger (`@t/logging`) | ✅ | `src/lib/logger.ts` resolves via DI; wired in composition root via `registerLoggerFactoryDI` + `registerLoggerDI`; `/api/health` emits structured log lines. |
| Error handling (`@t/errors`) | N/A | `@t/errors` `errorHandler()` targets Hono API routes. Next.js App Router uses `error.tsx` + `global-error.tsx` + `not-found.tsx` — all present with PostHog exception capture. No gap. |
| Auth | N/A | Marketing site, no auth target per architecture doc. |
| MDX pipeline (`@next/mdx`) | ✅ | `@next/mdx` + `@mdx-js/loader` + `@mdx-js/remark` + `@mdx-js/react` installed; remark-gfm + rehype-pretty-code (shiki github-dark-dimmed theme) plugins wired; `gray-matter` frontmatter parsing + Zod validation in `src/content/collection.ts`; filesystem-driven collection with 3 sample posts. |
| Analytics (client-side PostHog) | ✅ | `instrumentation-client.ts` inits `posthog-js`; `PHProvider` wraps layout.tsx; `PostHogPageView` captures pageviews; error boundaries capture exceptions to PostHog. |
| Analytics (`@t/analytics` server-side) | 🟡 | Client-side PostHog works via direct `posthog-js` integration. `@t/analytics` package not in deps; `registerAnalyticsDI` not called in composition root; no `src/lib/analytics.ts` wrapper. Server-side event tracking unwired. |
| DI / composition root (`@t/dependency-injection`) | ✅ | `src/lib/composition.ts` builds awilix container with config + logger registrations; memoized `getContainer()` singleton pattern. |
| Tests | ✅ | 10 unit tests (vitest, 80% coverage threshold across lines/branches/functions/statements); 8 e2e tests (playwright, 6 spec files). |
| SEO (metadata, OG, canonical, JSON-LD) | ✅ | `metadataBase` from config; title template in layout; per-post OG images via `ImageResponse`; canonical URLs; `sitemap.xml`; `robots.txt`; JSON-LD `BlogPosting` schema on post pages. |
| Railway healthcheck wiring | ✅ | `/api/health` route returns `{ status: 'ok' }` with structured logging; `railway.toml` declares healthcheck path. |
| Platform SDK (`@nutraforgetechnologies/ai` copilot) | ❌ | `page.tsx` carries a `TODO` import comment; awaits Platform SDK extraction. |
| Shadcn/ui | ✅ | Primitives installed via Shadcn CLI: button, card, badge, nav-menu, separator. `components.json` present; full light/dark CSS variable set in `globals.css`; `cn()` helper at `src/lib/utils.ts`. `@types/react` pinned to 19.0.12 via root overrides for build compat. |

## Gap summary

- **Server-side `@t/analytics` unwired.** Client-side PostHog works (instrumentation-client.ts +
  PHProvider), but `@t/analytics` package is not in deps, `registerAnalyticsDI` is not called in the
  composition root, and there is no `src/lib/analytics.ts` convenience export. Server-side event
  tracking (e.g., API route analytics) cannot use the shared AnalyticsTracker.
- **`@t/errors` is N/A.** The `@t/errors` package's `errorHandler()` targets Hono API routes.
  Next.js App Router's error boundary pattern (`error.tsx` + `global-error.tsx` + `not-found.tsx` —
  all present with PostHog exception capture) is the correct approach for this app. No actionable
  gap.
- **Platform SDK hook** (`page.tsx` copilot TODO) blocked on `@nutraforgetechnologies/ai`
  extraction.

## Notes for next agent

- Architecture source of truth: `docs/architecture/apps/website.md` (has full file layout, content
  model table, and 12-item bootstrap checklist). This PRD-status file mirrors that checklist.
- **First priority**: Wire `@t/analytics` server-side — add to `package.json` deps, call
  `registerAnalyticsDI` in composition root, add `src/lib/analytics.ts` convenience export.
  Client-side PostHog is already fully functional; this closes the only remaining gap.
- **Second priority**: Unblock Platform SDK (`@nutraforgetechnologies/ai` copilot) — blocked on
  extraction; no action in this repo until the SDK package exists.
- **Maintenance**: Any edit under `apps/website/**` must bump `last_audited` here and update
  `docs/prd-status/matrix.md`.
- Shadcn: Run `npx shadcn@latest add <component>` from `apps/website` to add more primitives.
  `@types/react` pinned to 19.0.12 via root overrides — preserve this if upgrading.
