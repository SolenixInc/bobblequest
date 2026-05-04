import { getPostBySlug, getPostSlugs } from '@/content/collection'
import { getWebsiteConfig } from '@/lib/config'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const ogImageUrl = `/blog/${slug}/opengraph-image`

  return {
    title: post.meta.title,
    description: post.meta.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: 'article',
      publishedTime: post.meta.date,
      authors: post.meta.author ? [post.meta.author] : undefined,
      tags: post.meta.tags,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta.title,
      description: post.meta.description,
      images: [ogImageUrl],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const { default: Content } = await import(`@/content/blog/${slug}.mdx`)

  const { siteUrl } = getWebsiteConfig()
  const ogImageUrl = `${siteUrl}/blog/${slug}/opengraph-image`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta.title,
    description: post.meta.description,
    datePublished: post.meta.date,
    author: {
      '@type': 'Person',
      name: post.meta.author ?? 'Template Site',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${slug}`,
    },
    image: ogImageUrl,
  }

  const jsonLdScript = (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data injection is the standard Next.js pattern; payload is fully constructed server-side from validated frontmatter.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      {jsonLdScript}
      <header className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-4xl font-bold tracking-tight">{post.meta.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(post.meta.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </p>
        {post.meta.tags && post.meta.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
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
      </header>
      <article className="prose max-w-none">
        <Content />
      </article>
    </main>
  )
}
