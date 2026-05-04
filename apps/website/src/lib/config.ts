import 'server-only'

import type { WebsiteConfig } from '@t/config'
import { getConfig } from './composition'

export function getWebsiteConfig(): WebsiteConfig {
  return getConfig()
}
