/**
 * Composition root for apps/mobile.
 *
 * Wires config and logging into the DI container.
 */
import { MobileConfigValuesSchema, registerConfigRepo } from '@t/config'
import { type Container, createContainer } from '@t/dependency-injection'
import { registerLoggerRnDI } from '@t/logging-rn'

export function buildContainer(): Container {
  const container = createContainer()

  registerConfigRepo(container, { schema: MobileConfigValuesSchema })

  registerLoggerRnDI(container, {
    context: { requestId: 'global', metadata: { service: 'mobile' } },
  })

  return container
}

let _container: Container | undefined

export function getContainer(): Container {
  if (!_container) {
    _container = buildContainer()
  }
  return _container
}
