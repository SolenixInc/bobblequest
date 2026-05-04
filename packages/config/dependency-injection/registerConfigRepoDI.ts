import { type Container, asValue, dependencyKeys } from '@t/dependency-injection'
import {
  ConfigRepositoryImpl,
  type ConfigRepositoryOptions,
} from '../infrastructure/ConfigRepositoryImpl.ts'

export function registerConfigRepo(container: Container, options?: ConfigRepositoryOptions) {
  container.register({
    [dependencyKeys.global.CONFIG]: asValue(new ConfigRepositoryImpl(options)),
  })
}
