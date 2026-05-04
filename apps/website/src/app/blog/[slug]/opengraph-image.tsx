import { getPostBySlug, getPostSlugs } from '@/content/collection'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }))
}

export default async function BlogPostOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  const title = post?.meta.title ?? 'Blog Post'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '64px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <p
          style={{
            fontSize: '20px',
            color: '#94a3b8',
            margin: 0,
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Template Site
        </p>
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#f8fafc',
            margin: 0,
            fontFamily: 'sans-serif',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
      </div>
    </div>,
    { ...size },
  )
}
