import 'server-only'

import { registerAnalyticsDI } from '@t/analytics'
import { WebConfigValuesSchema, registerConfigRepo } from '@t/config'
import type { Environment } from '@t/config'
import { type Container, createContainer, dependencyKeys } from '@t/dependency-injection'
import { registerLoggerDI, registerLoggerFactoryDI } from '@t/logging'

function buildContainer(): Container {
  const container = createContainer()

  registerConfigRepo(container, { schema: WebConfigValuesSchema })

  const config = container.resolve(dependencyKeys.global.CONFIG)
  const environment: Environment = (config.system?.environment ?? 'development') as Environment

  registerLoggerFactoryDI(container)
  registerLoggerDI(container, { context: { requestId: 'global', metadata: { service: 'web' } } })

  // biome-ignore lint/suspicious/noExplicitAny: cross-package env union mismatch (@t/analytics excludes 'testing')
  registerAnalyticsDI(container, { config, environment: environment as any, service: 'web' })

  return container
}

let _container: Container | undefined

export function getContainer(): Container {
  if (!_container) {
    _container = buildContainer()
  }
  return _container
}
