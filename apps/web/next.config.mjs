/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@t/analytics',
    '@t/analytics-browser',
    '@t/analytics-types',
    '@t/api',
    '@t/billing-browser',
    '@t/config',
    '@t/dependency-injection',
    '@t/errors',
    '@t/logging',
    '@t/logging-browser',
    '@t/logging-types',
  ],
  // awilix uses a dynamic native-module expression that webpack cannot statically
  // analyse in a bundle. Keep it server-side only.
  serverExternalPackages: ['awilix'],
  webpack: (config) => {
    // Suppress webpack cache advisory for large serialized strings and the
    // dynamic-require critical-dependency warning from awilix/lib/load-module-native.
    config.infrastructureLogging = { level: 'error' }
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /awilix\/lib\/load-module-native/ },
    ]
    return config
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ]
  },
}

export default nextConfig
