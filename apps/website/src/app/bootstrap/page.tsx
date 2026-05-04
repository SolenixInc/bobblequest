import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bootstrap Status',
  robots: { index: false, follow: false },
}

// ---------------------------------------------------------------------------
// Env var probe — presence only, never render values
// ---------------------------------------------------------------------------

type EnvVar = { name: string; set: boolean }

function probeEnvVars(): EnvVar[] {
  return [
    { name: 'SITE_URL', set: Boolean(process.env.SITE_URL) },
    { name: 'NEXT_PUBLIC_POSTHOG_KEY', set: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) },
    { name: 'NEXT_PUBLIC_POSTHOG_HOST', set: Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST) },
  ]
}

// ---------------------------------------------------------------------------
// MDX probe — imports the hello-world post through the same @next/mdx pipeline
// the blog uses. Returns the component so we can render it below.
// ---------------------------------------------------------------------------

type MdxProbeResult = { ok: true; Component: React.ComponentType } | { ok: false; error: string }

async function probeMdx(): Promise<MdxProbeResult> {
  try {
    const mod = await import('@/content/blog/hello-world.mdx')
    if (typeof mod.default !== 'function' && typeof mod.default !== 'object') {
      return { ok: false, error: 'module.default is not a React component' }
    }
    return { ok: true, Component: mod.default }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
          : 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
      }
      role="status"
      aria-label={ok ? 'set' : 'missing'}
    >
      {ok ? '✓ set' : '✗ missing'}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BootstrapPage() {
  const envVars = probeEnvVars()
  const mdxResult = await probeMdx()
  const buildTimestamp = new Date().toISOString()

  const bootstrapData = {
    timestamp: buildTimestamp,
    env: envVars.reduce<Record<string, boolean>>((acc, v) => {
      acc[v.name] = v.set
      return acc
    }, {}),
    mdx: mdxResult.ok
      ? { ok: true }
      : { ok: false, error: (mdxResult as { ok: false; error: string }).error },
  }

  const allEnvSet = envVars.every((v) => v.set)
  const allOk = allEnvSet && mdxResult.ok

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      {/* Machine-readable status blob for doctor scripts */}
      <script
        type="application/json"
        id="bootstrap-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bootstrapData) }}
      />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Bootstrap Status</h1>
          <span
            className={
              allOk
                ? 'rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800'
                : 'rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800'
            }
            aria-live="polite"
          >
            {allOk ? '✓ healthy' : '✗ degraded'}
          </span>
        </div>
        <p className="text-muted-foreground">App boot, env vars, MDX renderer, and build info.</p>
      </header>

      {/* Environment section */}
      <SectionCard title="Environment">
        <ul className="flex flex-col gap-3">
          {envVars.map((v) => (
            <li key={v.name} className="flex items-center justify-between gap-4">
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">{v.name}</code>
              <Badge ok={v.set} />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* MDX section */}
      <SectionCard title="MDX">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Pipeline</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">@next/mdx</span>
            <Badge ok={mdxResult.ok} />
            {!mdxResult.ok && (
              <span className="text-sm text-destructive">
                failed: {(mdxResult as { ok: false; error: string }).error}
              </span>
            )}
          </div>
          {mdxResult.ok && (
            <section
              className="prose max-w-none rounded-md border border-border bg-muted/30 p-4 text-sm"
              aria-label="MDX probe render output"
            >
              <mdxResult.Component />
            </section>
          )}
        </div>
      </SectionCard>

      {/* Build section */}
      <SectionCard title="Build">
        <dl className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Timestamp</dt>
            <dd>
              <time
                dateTime={buildTimestamp}
                className="rounded bg-muted px-2 py-0.5 font-mono text-sm"
              >
                {buildTimestamp}
              </time>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Node env</dt>
            <dd>
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                {process.env.NODE_ENV ?? 'unknown'}
              </code>
            </dd>
          </div>
        </dl>
      </SectionCard>
    </main>
  )
}
