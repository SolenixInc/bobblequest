import 'server-only'

import type { AnalyticsTracker } from '@t/analytics'
import { dependencyKeys } from '@t/dependency-injection'
import { getContainer } from './composition'

export const analytics = getContainer().resolve<AnalyticsTracker>(dependencyKeys.global.ANALYTICS)
