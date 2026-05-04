import { getWebsiteConfig } from '@/lib/config'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getWebsiteConfig()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
