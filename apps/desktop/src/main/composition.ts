/**
 * Composition root for apps/desktop (Electron main process).
 *
 * Wires config and logging into the DI container. Desktop main is a thin
 * process — cache, db, auth-server, and billing are intentionally excluded;
 * add them here only when the main process needs them directly.
 */
import { DesktopConfigValuesSchema, registerConfigRepo } from '@t/config'
import { type Container, createContainer, dependencyKeys } from '@t/dependency-injection'
import { registerLoggerDI, registerLoggerFactoryDI } from '@t/logging'

export function buildContainer(): Container {
  const container = createContainer()

  // 1. Config — must be first; everything else reads from it.
  registerConfigRepo(container, { schema: DesktopConfigValuesSchema })

  // 2. Logger infrastructure (factory first, then the named global logger).
  registerLoggerFactoryDI(container)
  registerLoggerDI(container, {
    context: { requestId: 'global', fileName: 'apps/desktop/main', metadata: { app: 'desktop' } },
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

export { dependencyKeys }
