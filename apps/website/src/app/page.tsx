import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Template Site',
  description: 'Marketing site scaffold for the template-repo monorepo.',
  openGraph: {
    title: 'Template Site',
    description: 'Marketing site scaffold for the template-repo monorepo.',
    url: '/',
  },
  alternates: {
    canonical: '/',
  },
}

// TODO: import from @nutraforgetechnologies/ai — mount marketing-site chatbot / contact-form copilot once Platform SDK ships
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">Template Website</h1>
      <p className="max-w-xl text-center text-muted-foreground">
        Marketing site scaffold. Extend with landing sections, pricing, and docs in v0.2.
      </p>
      <div className="flex gap-4">
        <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/blog">
          Read the blog
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/api/health">
          Health check
        </Link>
      </div>
    </main>
  )
}
