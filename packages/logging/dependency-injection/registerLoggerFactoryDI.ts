import { type Container, asFunction, dependencyKeys, lifetimeConfig } from '@t/dependency-injection'
import { createGlobalLogger } from '../index.ts'

export function registerLoggerFactoryDI(container: Container): void {
  container.register({
    [dependencyKeys.global.LOGGER_FACTORY]: asFunction(() => createGlobalLogger, {
      lifetime: lifetimeConfig.SINGLETON,
    }),
  })
}
