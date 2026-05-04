import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // awilix uses a dynamic native-module expression that webpack cannot statically
  // analyse in a bundle. Keep it server-side only.
  serverExternalPackages: ['awilix'],
  webpack: (config) => {
    // Suppress webpack cache advisory for large serialized strings (incidental to
    // awilix / DI container inlined metadata) and the dynamic-require critical-
    // dependency warning from awilix/lib/load-module-native.
    config.infrastructureLogging = { level: 'error' }
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /awilix\/lib\/load-module-native/ },
    ]
    return config
  },
}

// Plugin references must be strings (not imported functions) for Turbopack
// serialization. @next/mdx's mdx-js-loader resolves string names at load time.
const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: [['rehype-pretty-code', { theme: 'github-dark-dimmed' }]],
  },
})

export default withMDX(nextConfig)
