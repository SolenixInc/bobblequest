import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Template Web</h1>
      <p className="text-muted-foreground">Authenticated product UI</p>
      <div className="flex gap-4">
        <Link className="underline" href="/login">
          Login
        </Link>
        <Link className="underline" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  )
}
