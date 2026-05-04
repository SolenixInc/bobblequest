import { expect, test } from '@playwright/test'

test('hello-world post renders title, paragraph content, and syntax-highlighted code', async ({
  page,
}) => {
  await page.goto('/blog/hello-world')

  await expect(page.locator('header h1').filter({ hasText: 'Hello, world' })).toBeVisible()

  await expect(page.locator('article p').first()).toBeVisible()

  // rehype-pretty-code annotates code elements with data-language
  const codeBlock = page.locator('code[data-language]').first()
  await expect(codeBlock).toBeVisible()
})
