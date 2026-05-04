import { isClerkConfigured } from '@/lib/server/auth'
import { auth } from '@clerk/nextjs/server'
import { DashboardSubscriptionStatus } from './_components/DashboardSubscriptionStatus'

export default async function DashboardPage() {
  // When CLERK_SECRET_KEY is absent (dev / placeholder env), auth() throws
  // "Missing secretKey". Skip auth and render an informational banner instead.
  if (!isClerkConfigured()) {
    return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Auth is disabled — set CLERK_SECRET_KEY to enable authentication.
        </p>
      </main>
    )
  }

  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <DashboardSubscriptionStatus />
    </main>
  )
}
