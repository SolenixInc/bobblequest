import 'server-only'

import { dependencyKeys } from '@t/dependency-injection'
import type { GlobalLogger } from '@t/logging'
import { getContainer } from './composition'

export const logger = getContainer().resolve<GlobalLogger>(dependencyKeys.global.LOGGER)
