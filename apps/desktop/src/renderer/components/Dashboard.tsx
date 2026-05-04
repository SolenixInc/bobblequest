import { useClerk } from '../lib/clerk'
import { trpc } from '../lib/trpc'

export function Dashboard() {
  const { signOut } = useClerk()
  const { data: userMe, isLoading: userLoading } = trpc.users.me.useQuery(undefined, {
    retry: false,
  })

  async function handleLogout() {
    await signOut()
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading…</p>
      </div>
    )
  }

  // TODO: import from @nutraforgetechnologies/billing — render license / subscription status panel once Platform SDK ships
  return (
    <main className="flex min-h-screen flex-col p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="rounded border px-4 py-2" onClick={handleLogout} type="button">
          Sign out
        </button>
      </header>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Users / Me</h2>
        <pre className="overflow-auto rounded border bg-muted p-4 text-sm">
          {JSON.stringify(userMe, null, 2)}
        </pre>
      </section>
    </main>
  )
}
