import { expect, test } from '@playwright/test'

test('unknown blog slug shows blog not-found page', async ({ page }) => {
  await page.goto('/blog/does-not-exist-xyz')

  await expect(page.getByText('Post not found')).toBeVisible()
})

test('totally unknown route shows root not-found page', async ({ page }) => {
  await page.goto('/totally-fake-route')

  await expect(page.getByText('Page not found')).toBeVisible()
})
