/**
 * Bootstrap status route — #/bootstrap
 *
 * Proves:
 *   - App booted (rendered at all)
 *   - Renderer→main IPC is alive (ping check)
 *   - Env vars are present in main process (presence flags only — values never rendered)
 *   - Build timestamp
 *
 * Embeds <script id="bootstrap-data" type="application/json"> for doctor-script scraping.
 */
import { useEffect, useState } from 'react'
import { desktopClientConfig } from '../lib/clientConfig'

// BootstrapStatus and window.api are declared in src/types/preload-api.d.ts

type IpcStatus = 'idle' | 'checking' | 'ok' | 'error'

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      aria-label={ok ? 'present' : 'missing'}
      className={ok ? 'font-mono text-green-600' : 'font-mono text-red-600'}
      role="img"
    >
      {ok ? '✓' : '✗'}
    </span>
  )
}

export function BootstrapRoute() {
  const [status, setStatus] = useState<BootstrapStatus | null>(null)
  const [ipc, setIpc] = useState<IpcStatus>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Renderer-side env vars (VITE_* — presence only, no values)
  const rendererEnv: [string, boolean][] = [
    ['VITE_CLERK_PUBLISHABLE_KEY', Boolean(desktopClientConfig.clerk.publishableKey)],
    ['VITE_API_URL', Boolean(desktopClientConfig.trpc.url)],
    ['VITE_REVENUECAT_PUBLIC_API_KEY', Boolean(desktopClientConfig.revenueCat.publicApiKey)],
  ]

  useEffect(() => {
    if (typeof window.api === 'undefined') {
      setFetchError('window.api is not defined — preload bridge missing')
      return
    }
    window.api
      .getBootstrapStatus()
      .then(setStatus)
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : String(err))
      })
  }, [])

  function handlePing() {
    if (typeof window.api === 'undefined') {
      setIpc('error')
      return
    }
    setIpc('checking')
    window.api
      .ping()
      .then((res: string) => {
        setIpc(res === 'pong' ? 'ok' : 'error')
      })
      .catch(() => {
        setIpc('error')
      })
  }

  const mainEnvEntries: [string, boolean][] = status
    ? Object.entries(status.env).map(([k, v]) => [k, Boolean(v)])
    : []

  const bootstrapData = {
    booted: true,
    ipc,
    mainEnv: status?.env ?? null,
    rendererEnv: Object.fromEntries(rendererEnv),
    buildTimestamp:
      status?.buildTimestamp ??
      (import.meta.env.VITE_BUILD_TIMESTAMP as string | undefined) ??
      null,
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      {/* Machine-readable data for doctor scripts */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bootstrapData, null, 2) }}
        id="bootstrap-data"
        type="application/json"
      />

      <header className="mb-8">
        <h1 className="text-2xl font-bold">Bootstrap Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diagnostic view — proves app boot, IPC connectivity, and env var presence.
        </p>
      </header>

      {fetchError && (
        <div
          className="mb-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <strong>Error loading status:</strong> {fetchError}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Environment card */}
        <section aria-labelledby="env-heading" className="rounded border p-5">
          <h2 className="mb-3 font-semibold" id="env-heading">
            Environment
          </h2>

          {status ? (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Main process
              </p>
              <ul className="space-y-1 text-sm">
                {mainEnvEntries.map(([key, present]) => (
                  <li className="flex items-center justify-between gap-2" key={key}>
                    <span className="font-mono text-xs">{key}</span>
                    <StatusBadge ok={present} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {fetchError ? 'Unavailable' : 'Loading…'}
            </p>
          )}

          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Renderer (VITE_*)
          </p>
          <ul className="space-y-1 text-sm">
            {rendererEnv.map(([key, present]) => (
              <li className="flex items-center justify-between gap-2" key={key}>
                <span className="font-mono text-xs">{key}</span>
                <StatusBadge ok={present} />
              </li>
            ))}
          </ul>
        </section>

        {/* IPC card */}
        <section aria-labelledby="ipc-heading" className="rounded border p-5">
          <h2 className="mb-3 font-semibold" id="ipc-heading">
            IPC
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sends a no-op ping to the main process and checks for a pong response.
          </p>

          <div className="flex items-center gap-3">
            <button
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
              disabled={ipc === 'checking'}
              onClick={handlePing}
              type="button"
            >
              {ipc === 'checking' ? 'Pinging…' : 'Ping main process'}
            </button>

            {ipc === 'ok' && (
              <span aria-label="IPC ok" className="font-mono text-green-600" role="img">
                ✓ pong
              </span>
            )}
            {ipc === 'error' && (
              <span aria-label="IPC error" className="font-mono text-red-600" role="img">
                ✗ error
              </span>
            )}
          </div>
        </section>

        {/* Build card */}
        <section aria-labelledby="build-heading" className="rounded border p-5">
          <h2 className="mb-3 font-semibold" id="build-heading">
            Build
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Timestamp
              </dt>
              <dd className="mt-0.5 font-mono text-xs">
                {status?.buildTimestamp ??
                  (import.meta.env.VITE_BUILD_TIMESTAMP as string | undefined) ?? (
                    <span className="text-muted-foreground">not set</span>
                  )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mode
              </dt>
              <dd className="mt-0.5 font-mono text-xs">{import.meta.env.MODE}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="mt-8">
        <button
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={() => {
            window.location.hash = '/'
          }}
          type="button"
        >
          Back to app
        </button>
      </footer>
    </main>
  )
}
