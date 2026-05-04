import 'server-only'

import { registerAnalyticsDI } from '@t/analytics'
import { WebConfigValuesSchema, registerConfigRepo, resolveWebsiteConfig } from '@t/config'
import type { Environment, WebsiteConfig } from '@t/config'
import { type Container, createContainer, dependencyKeys } from '@t/dependency-injection'
import { registerLoggerDI, registerLoggerFactoryDI } from '@t/logging'

function buildContainer(): Container {
  const container = createContainer()

  registerConfigRepo(container, { schema: WebConfigValuesSchema })

  const config = container.resolve(dependencyKeys.global.CONFIG)
  /* WebConfigValuesSchema.system.environment carries a zod .default('development'),
     so config.system is always defined and environment is never nullish after parse.
     The ?. and ?? 'development' guards are unreachable defensive code. */
  /* v8 ignore next */
  const environment: Environment = (config.system?.environment ?? 'development') as Environment

  registerLoggerFactoryDI(container)
  registerLoggerDI(container, {
    context: { requestId: 'global', metadata: { service: 'website' } },
  })

  // biome-ignore lint/suspicious/noExplicitAny: cross-package env union mismatch (@t/analytics excludes 'testing')
  registerAnalyticsDI(container, { config, environment: environment as any, service: 'website' })

  return container
}

let _container: Container | undefined

export function getContainer(): Container {
  if (!_container) {
    _container = buildContainer()
  }
  return _container
}

export function getConfig(): WebsiteConfig {
  const cfg = resolveWebsiteConfig(process.env)
  if (!cfg) {
    throw new Error(
      'Composition root: resolveWebsiteConfig returned undefined. Ensure SITE_URL is set in environment.',
    )
  }
  return cfg
}
