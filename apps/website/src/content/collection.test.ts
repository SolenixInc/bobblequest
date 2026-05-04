import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getAllPosts, getPostBySlug, getPostFrontmatter, getPostSlugs } from './collection'

let tmpDir: string
let contentDir: string

function writeMdx(filename: string, frontmatter: Record<string, unknown>, body = 'Body.') {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
  fs.writeFileSync(path.join(contentDir, filename), `---\n${fm}\n---\n\n${body}`, 'utf-8')
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-test-'))
  contentDir = path.join(tmpDir, 'src', 'content', 'blog')
  fs.mkdirSync(contentDir, { recursive: true })

  writeMdx('hello-world.mdx', {
    title: 'Hello, world',
    date: '2026-04-19',
    description: 'First post.',
    tags: ['meta'],
    author: 'Author',
  })
  writeMdx('building-with-mdx.mdx', {
    title: 'Building with MDX',
    date: '2026-04-20',
    description: 'About MDX.',
    tags: ['mdx'],
    author: 'Author',
  })
  writeMdx('design-tokens.mdx', {
    title: 'Design Tokens',
    date: '2026-04-21',
    description: 'Tailwind tokens.',
    tags: ['design'],
    author: 'Author',
  })

  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
})

afterAll(() => {
  vi.restoreAllMocks()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('getPostSlugs', () => {
  it('returns a slug for each mdx file', () => {
    const slugs = getPostSlugs()
    expect(slugs).toHaveLength(3)
    expect(slugs).toContain('hello-world')
  })
})

describe('getAllPosts', () => {
  it('returns 3 posts', () => {
    const posts = getAllPosts()
    expect(posts).toHaveLength(3)
  })

  it('sorts posts by date descending', () => {
    const posts = getAllPosts()
    expect(posts[0].meta.date).toBe('2026-04-21')
    expect(posts[1].meta.date).toBe('2026-04-20')
    expect(posts[2].meta.date).toBe('2026-04-19')
  })
})

describe('getPostBySlug', () => {
  it('returns matching post for hello-world', () => {
    const post = getPostBySlug('hello-world')
    expect(post).not.toBeNull()
    expect(post?.slug).toBe('hello-world')
    expect(post?.meta.title).toBe('Hello, world')
    expect(post?.meta.description).toBe('First post.')
    expect(post?.meta.tags).toEqual(['meta'])
  })

  it('returns null for unknown slug', () => {
    const post = getPostBySlug('does-not-exist')
    expect(post).toBeNull()
  })
})

describe('getPostFrontmatter', () => {
  it('returns meta for a known slug', () => {
    const meta = getPostFrontmatter('hello-world')
    expect(meta).not.toBeNull()
    expect(meta?.title).toBe('Hello, world')
  })

  it('returns null for an unknown slug', () => {
    const meta = getPostFrontmatter('does-not-exist')
    expect(meta).toBeNull()
  })
})

describe('frontmatter validation', () => {
  afterEach(() => {
    const bad = path.join(contentDir, 'bad-post.mdx')
    if (fs.existsSync(bad)) fs.rmSync(bad)
  })

  it('throws on malformed frontmatter (title is number, date is invalid)', () => {
    fs.writeFileSync(
      path.join(contentDir, 'bad-post.mdx'),
      `---\ntitle: 42\ndate: "not-a-date"\ndescription: "ok"\n---\n\nBody.`,
      'utf-8',
    )
    expect(() => getPostBySlug('bad-post')).toThrow()
  })
})
