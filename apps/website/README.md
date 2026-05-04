# apps/website

Unauthenticated Next.js 15 marketing site and MDX blog. Public, RSC- or SSG-rendered, no auth, no tRPC, no database. Ships as its own Railway service on port 3002 with a thin server-side DI composition root (logger + config + analytics) and PostHog client analytics. The only runtime branch is `SITE_URL` flowing into sitemap, robots, and OG metadata. App-shell auth flows live in `apps/web` — never here.

## Run it

```bash
bun run --filter @t/website dev    # standalone, no backend dependencies
bun run dev                        # full stack
```

Local URL: http://localhost:3002

## Tech

- Next.js 15 (App Router, RSC) + Turbopack + React 19
- Tailwind CSS v4 (`@tailwindcss/postcss`) + shadcn/ui primitives
- @next/mdx + gray-matter + rehype-pretty-code + shiki (blog post compilation)
- @t/analytics-browser (PostHog) via `AppAnalyticsProvider`
- @t/config, @t/logging, @t/dependency-injection (server-side DI)
- No auth, no tRPC, no database

## Entry points

- `src/app/layout.tsx` — RootLayout, `generateMetadata` via `getWebsiteConfig()`, `AppAnalyticsProvider`
- `src/app/page.tsx` — `/` landing (static RSC)
- `src/app/blog/page.tsx` — SSG post index
- `src/app/blog/[slug]/page.tsx` — SSG per-post (MDX import + frontmatter)
- `src/content/blog/*.mdx` — filesystem-driven MDX collection (sorted by date desc)
- `src/content/collection.ts` — MDX collection loader
- `src/app/sitemap.ts` / `src/app/robots.ts` — `SITE_URL`-driven metadata routes
- `src/app/api/health/route.ts` — Railway healthcheck (`GET → { status: "ok" }`)
- `src/lib/composition.ts` — server-only DI root (`buildContainer()` / `getContainer()`)
- `src/lib/config.ts` — `getWebsiteConfig()` over `@t/config`

## Configuration

Env vars: see `../../docs/reference/env-vars.md` (filtered to Website section). `SITE_URL` is required and hard-throws on boot — no silent fallbacks. All `process.env` reads must go through `getWebsiteConfig()` or the DI container.

App-specific .env: `./.env` (template at `./.env.example`).

## Deeper reading

- Agent rules: `./AGENTS.md`
- Platform architecture: `../../docs/architecture/platform/`
