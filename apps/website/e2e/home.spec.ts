import { expect, test } from '@playwright/test'

test('homepage title, heading, and screenshot', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Template Site/)
  await expect(page.getByRole('heading', { name: 'Template Website' })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: true })
})
