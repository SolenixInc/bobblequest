/**
 * /bootstrap — first-day smoke test for the web app.
 *
 * Server Component: reads process.env directly — nothing is rendered to the
 * client except presence (✓ / ✗) and the redacted JSON status block.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EnvCheck = { key: string; set: boolean }

type ApiStatus = { ok: true; data: unknown } | { ok: false; error: string }

interface BootstrapStatus {
  env: EnvCheck[]
  api: ApiStatus
  auth: { publishableKeySet: boolean; secretKeySet: boolean }
  build: { timestamp: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function check(key: string): EnvCheck {
  return { key, set: Boolean(process.env[key]) }
}

async function fetchApiBootstrap(): Promise<ApiStatus> {
  // Derive base URL from NEXT_PUBLIC_TRPC_URL (strip /trpc suffix) or API_URL.
  const trpcUrl = process.env.NEXT_PUBLIC_TRPC_URL ?? ''
  const base =
    process.env.API_URL ??
    (trpcUrl.endsWith('/trpc') ? trpcUrl.slice(0, -5) : trpcUrl.replace(/\/+$/, ''))

  if (!base) {
    return {
      ok: false,
      error: 'API base URL not configured (API_URL / NEXT_PUBLIC_TRPC_URL missing)',
    }
  }

  try {
    const res = await fetch(`${base}/bootstrap`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${res.statusText}` }
    }
    const data: unknown = await res.json()
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `unreachable: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// BootstrapJsonBlock — wraps the machine-readable <script> tag.
// Extracted so the biome-ignore comment can live as a regular JS comment.
// ---------------------------------------------------------------------------

function BootstrapJsonBlock({ status }: { status: BootstrapStatus }) {
  return (
    <script
      type="application/json"
      id="bootstrap-data"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(status) }}
    />
  )
}

// ---------------------------------------------------------------------------
// Badge sub-component (plain Tailwind — no shadcn deps required)
// ---------------------------------------------------------------------------

function Badge({ ok, label }: { ok: boolean; label?: string }) {
  const text = label ?? (ok ? '✓ set' : '✗ missing')
  return (
    <span
      className={[
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        ok
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      ].join(' ')}
    >
      {text}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h2
        id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BootstrapPage() {
  // All env vars the web app reads (from clientConfig + server-only vars).
  const envChecks: EnvCheck[] = [
    // Public (NEXT_PUBLIC_*) — safe to report presence in client context
    check('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    check('NEXT_PUBLIC_TRPC_URL'),
    check('NEXT_PUBLIC_POSTHOG_KEY'),
    check('NEXT_PUBLIC_POSTHOG_HOST'),
    check('NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY'),
    check('NEXT_PUBLIC_ENVIRONMENT'),
    // Runtime / Next.js
    check('ENVIRONMENT'),
    check('NODE_ENV'),
    // Server-only (Clerk)
    check('CLERK_SECRET_KEY'),
    check('NEXT_PUBLIC_CLERK_SIGN_IN_URL'),
    check('NEXT_PUBLIC_CLERK_SIGN_UP_URL'),
    check('NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL'),
    check('NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL'),
  ]

  const apiStatus = await fetchApiBootstrap()

  const authStatus = {
    publishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    secretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
  }

  const buildTimestamp = process.env.NEXT_BUILD_ID ?? new Date().toISOString()

  const status: BootstrapStatus = {
    env: envChecks,
    api: apiStatus,
    auth: authStatus,
    build: { timestamp: buildTimestamp },
  }

  const allEnvSet = envChecks.every((e) => e.set)
  const allOk = allEnvSet && apiStatus.ok && authStatus.publishableKeySet && authStatus.secretKeySet

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bootstrap Status</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              First-day smoke test — env presence, API reachability, auth wiring.
            </p>
          </div>
          <Badge ok={allOk} label={allOk ? '✓ all systems go' : '✗ action needed'} />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Environment                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Section title="Environment">
          <ul className="space-y-2">
            {envChecks.map((e) => (
              <li key={e.key} className="flex items-center justify-between text-sm">
                <code className="font-mono text-xs text-foreground/80">{e.key}</code>
                <Badge ok={e.set} />
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* API Connectivity                                                   */}
        {/* ---------------------------------------------------------------- */}
        <Section title="API Connectivity">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <code className="font-mono text-xs">GET /bootstrap</code>
              </span>
              <Badge
                ok={apiStatus.ok}
                label={
                  apiStatus.ok ? '✓ ok' : `✗ ${(apiStatus as { ok: false; error: string }).error}`
                }
              />
            </div>
            {apiStatus.ok && (
              <pre className="overflow-auto rounded bg-muted px-4 py-3 text-xs text-muted-foreground">
                {JSON.stringify(apiStatus.data, null, 2)}
              </pre>
            )}
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Auth                                                               */}
        {/* ---------------------------------------------------------------- */}
        <Section title="Auth">
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <code className="font-mono text-xs text-foreground/80">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              </code>
              <Badge ok={authStatus.publishableKeySet} />
            </li>
            <li className="flex items-center justify-between text-sm">
              <code className="font-mono text-xs text-foreground/80">CLERK_SECRET_KEY</code>
              <Badge ok={authStatus.secretKeySet} />
            </li>
          </ul>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Build                                                              */}
        {/* ---------------------------------------------------------------- */}
        <Section title="Build">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Timestamp</span>
            <code className="font-mono text-xs">{buildTimestamp}</code>
          </div>
        </Section>

        {/* Machine-readable JSON (for doctor scripts) */}
        <BootstrapJsonBlock status={status} />
      </div>
    </main>
  )
}
