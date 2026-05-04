// PostHog is initialised exclusively by AppAnalyticsProvider in src/app/providers/analytics-provider.tsx.
// This file is intentionally empty — Next.js requires its presence for the instrumentation-client
// entry point but all analytics bootstrap happens inside the React provider tree to avoid double-init.
export {}
