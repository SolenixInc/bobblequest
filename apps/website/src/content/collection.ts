import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

export const BlogPostMetaSchema = z.object({
  title: z.string(),
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
})

export type BlogPostMeta = z.infer<typeof BlogPostMetaSchema>

export type BlogPost = {
  slug: string
  meta: BlogPostMeta
}

function getContentDir(): string {
  return path.join(process.cwd(), 'src/content/blog')
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.mdx$/, '')
}

function parsePost(slug: string): BlogPost {
  const filePath = path.join(getContentDir(), `${slug}.mdx`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(raw)
  const meta = BlogPostMetaSchema.parse(data)
  return { slug, meta }
}

export function getPostSlugs(): string[] {
  return fs
    .readdirSync(getContentDir())
    .filter((f) => f.endsWith('.mdx'))
    .map(slugFromFilename)
}

export function getAllPosts(): BlogPost[] {
  return getPostSlugs()
    .map(parsePost)
    .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1))
}

export function getPostBySlug(slug: string): BlogPost | null {
  const slugs = getPostSlugs()
  if (!slugs.includes(slug)) return null
  return parsePost(slug)
}

export function getPostFrontmatter(slug: string): BlogPostMeta | null {
  return getPostBySlug(slug)?.meta ?? null
}
