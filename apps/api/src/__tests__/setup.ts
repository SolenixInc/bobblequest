// Runtime environment — 'testing' causes all registrars to soft-fail safely.
// Assigned at module level (not inside beforeAll) so the values are present
// before any test file's beforeAll hook runs — required when vitest uses the
// projects: config which may interleave setup-file and test-file beforeAll hooks.
process.env.ENVIRONMENT = 'testing'

// Analytics (PostHog apiKey is required by ConfigValuesSchema)
process.env.POSTHOG_API_KEY = 'phc_test_dummy'

// Auth
process.env.CLERK_SECRET_KEY = 'sk_test_dummy'
process.env.CLERK_WEBHOOK_SECRET = 'whsec_dummy'

// Database (optional in testing — registerDbDI skips DB binding when ENVIRONMENT=testing)
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/test'

// SystemConfig required fields
process.env.AI_SERVICE_URL = 'http://localhost:8000'
process.env.METRICS_AUTH_TOKEN = 'test-metrics-token'
process.env.SYSTEM_API_KEY = 'test-system-key'

// Stripe required fields (billing try/catch handles parse failures gracefully)
process.env.STRIPE_KEY = 'sk_test_dummy'
process.env.STRIPE_REDIRECT_DOMAIN = 'http://localhost:3000'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stripe_dummy'

// Apple required fields
process.env.APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com'
process.env.APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com'
process.env.APPLE_APP_SHARED_SECRET = 'test-apple-secret'

// App Store required fields
process.env.APP_STORE_BUNDLE_ID = 'com.example.test'
process.env.APP_STORE_ENVIRONMENT = 'Sandbox'

// Android required fields
process.env.ANDROID_PUBLISHER_URL = 'https://androidpublisher.googleapis.com'

// RevenueCat required fields
process.env.CORE_REVENUE_CAT_API_KEY = 'test-rc-api-key'
process.env.CORE_REVENUE_CAT_PROJECT_ID = 'test-rc-project'
process.env.CORE_REVENUE_CAT_NUTRAFORGE_ENTITLEMENT_ID = 'test-entitlement'
process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = 'test-rc-webhook-secret'

// Cron secret
process.env.CRON_SECRET = 'test-cron-secret'
