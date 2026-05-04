import { getAllPosts } from '@/content/collection'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Writing from the team.',
  alternates: {
    canonical: '/blog',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground">Writing from the team.</p>
      </header>
      <ul className="flex flex-col gap-4">
        {posts.map((post) => (
          <li key={post.slug} className="rounded-md border p-4">
            <Link className="text-xl font-semibold underline" href={`/blog/${post.slug}`}>
              {post.meta.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(post.meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
            <p className="mt-2">{post.meta.description}</p>
            {post.meta.tags && post.meta.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.meta.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
