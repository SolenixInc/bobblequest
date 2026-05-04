import { expect, test } from '@playwright/test'

test('blog listing has heading and at least 3 post links pointing to /blog/<slug>', async ({
  page,
}) => {
  await page.goto('/blog')

  await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()

  const links = page.locator('a[href^="/blog/"]')
  await expect(links).toHaveCount(3)

  const hrefs = await links.evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''),
  )
  for (const href of hrefs) {
    expect(href).toMatch(/^\/blog\/.+/)
  }
})
