/**
 * Clerk testing-tokens Playwright fixture.
 *
 * Provides an authenticated `page` fixture that signs in once via Clerk's
 * official testing-tokens SDK before any page navigation occurs.
 *
 * Skip behaviour:
 * - CLERK_SECRET_KEY absent  → skip silently (mirrors the CLERK_PUBLISHABLE_KEY
 *   pattern used in auth-routes.spec.ts / dashboard.spec.ts).
 * - CLERK_SECRET_KEY present but E2E_CLERK_USER_EMAIL or
 *   E2E_CLERK_USER_PASSWORD missing → hard-fail (config-hard-fail rule).
 *
 * Playwright wiring (task C3):
 * - Import `clerkSetupGlobal` from this module in the Playwright global-setup
 *   file and call it once before the test run.
 * - Replace `test` imports in specs that need auth with the `test` export here.
 */

import { clerkSetup, clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Global setup helper — call once from playwright.config.ts globalSetup
// ---------------------------------------------------------------------------

/**
 * Initialises Clerk for testing. Must be called from a Playwright global-setup
 * file (configured in playwright.config.ts — task C3).
 */
export async function clerkSetupGlobal(): Promise<void> {
  await clerkSetup()
}

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

type AuthFixtures = {
  /**
   * A Playwright `Page` that is already signed in as the test user defined by
   * E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD.
   *
   * Tests using this fixture are automatically skipped when CLERK_SECRET_KEY
   * is absent, and hard-fail when the secret key is present but the test-user
   * credentials are missing.
   */
  authenticatedPage: Page
}

// ---------------------------------------------------------------------------
// Extended test object
// ---------------------------------------------------------------------------

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use, testInfo) => {
    const secretKey = process.env.CLERK_SECRET_KEY

    // Skip the test (not a hard failure) when the Clerk secret key is absent.
    // Mirrors: test.skip(!process.env.CLERK_PUBLISHABLE_KEY, 'requires Clerk env')
    if (!secretKey) {
      testInfo.skip(true, 'requires CLERK_SECRET_KEY env')
      // `testInfo.skip` throws internally, so the lines below are unreachable
      // but TypeScript requires the call path to end — satisfy it.
      await use(page)
      return
    }

    // Hard-fail when the secret key is present but test-user credentials are
    // missing. A CI environment that sets CLERK_SECRET_KEY must also supply
    // both credential vars — silence here would mask mis-configured pipelines.
    const email = process.env.E2E_CLERK_USER_EMAIL
    const password = process.env.E2E_CLERK_USER_PASSWORD
    if (!email || !password) {
      throw new Error(
        'CLERK_SECRET_KEY is set but E2E_CLERK_USER_EMAIL and/or ' +
          'E2E_CLERK_USER_PASSWORD are missing. ' +
          'Both are required for authenticated Playwright tests.',
      )
    }

    // Install the bot-detection bypass BEFORE any page.goto call so that the
    // intercept route is active for the very first navigation.
    await setupClerkTestingToken({ page })

    // Navigate to the app root so that Clerk loads in the browser context —
    // clerk.signIn requires an active Clerk instance on the page.
    await page.goto('/')

    // Sign in using the password strategy with env-sourced credentials.
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: email,
        password,
      },
    })

    // Hand the signed-in page to the test body.
    await use(page)

    // No explicit sign-out: Playwright isolates browser contexts per worker,
    // so session state does not bleed between test files.
  },
})

export { expect } from '@playwright/test'
