import { expect, test } from '@playwright/test'

test('GET /sign-in renders Clerk SignIn component', async ({ page }) => {
  test.skip(!process.env.CLERK_PUBLISHABLE_KEY, 'requires Clerk env')

  const response = await page.goto('/sign-in')
  expect(response?.status()).toBe(200)

  await expect(page.locator('input[type="email"], input[name="identifier"]').first()).toBeVisible({
    timeout: 10000,
  })
})

test('GET /sign-up renders Clerk SignUp component', async ({ page }) => {
  test.skip(!process.env.CLERK_PUBLISHABLE_KEY, 'requires Clerk env')

  const response = await page.goto('/sign-up')
  expect(response?.status()).toBe(200)

  await expect(page.locator('input[type="email"], input[name="emailAddress"]').first()).toBeVisible(
    {
      timeout: 10000,
    },
  )
})

test('GET /dashboard while signed-out redirects to sign-in', async ({ page }) => {
  test.skip(!process.env.CLERK_PUBLISHABLE_KEY, 'requires Clerk env')

  await page.goto('/dashboard')

  // Server-side auth() + redirectToSignIn() produces a redirect to /sign-in
  await expect(page).toHaveURL(/sign-in/, { timeout: 10000 })
})
