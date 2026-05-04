import { expect, test } from '@playwright/test'

const SLUGS = ['hello-world', 'building-with-mdx', 'design-tokens']

test('sitemap.xml includes root, /blog, and all post URLs', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)

  const body = await res.text()
  expect(body).toContain('<loc>')
  expect(body).toMatch(/<loc>[^<]+<\/loc>/)

  // Root and blog index
  expect(body).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/)
  expect(body).toContain('/blog')

  // Each post slug
  for (const slug of SLUGS) {
    expect(body).toContain(`/blog/${slug}`)
  }
})

test('robots.txt has Sitemap directive and User-agent wildcard', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)

  const body = await res.text()
  expect(body.toLowerCase()).toContain('user-agent: *')
  expect(body).toContain('Sitemap:')
})
