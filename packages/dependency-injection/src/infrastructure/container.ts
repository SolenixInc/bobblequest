import { Lifetime } from 'awilix'

export {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime,
} from 'awilix'

export type { AwilixContainer, Resolver } from 'awilix'

/**
 * Canonical lifetime constants for `.register(..., { lifetime: ... })`
 * call sites that prefer an options-bag form over the fluent
 * `.singleton()`/`.scoped()`/`.transient()` builders.
 */
export const lifetimeConfig = {
  SINGLETON: Lifetime.SINGLETON,
  SCOPED: Lifetime.SCOPED,
  TRANSIENT: Lifetime.TRANSIENT,
} as const

/**
 * Alias for `AwilixContainer<any>` used throughout the monorepo's
 * `register*DI` functions.
 */
export type Container = import('awilix').AwilixContainer
