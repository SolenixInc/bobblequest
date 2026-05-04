import { describe, expect, test } from 'vitest'
import {
  InjectionMode,
  Lifetime,
  asClass,
  asFunction,
  asValue,
  createContainer,
  lifetimeConfig,
} from '../src/infrastructure/container.ts'

class ServiceA {
  greet() {
    return 'hello'
  }
}

describe('createContainer', () => {
  test('creates a container with a register/resolve API', () => {
    const c = createContainer()
    expect(c).toBeDefined()
    expect(typeof c.register).toBe('function')
    expect(typeof c.resolve).toBe('function')
  })

  test('asValue: resolves a primitive value', () => {
    const c = createContainer()
    c.register({ myVal: asValue(42) })
    expect(c.resolve('myVal')).toBe(42)
  })

  test('asClass: resolves an instance of the registered class', () => {
    const c = createContainer()
    c.register({ svc: asClass(ServiceA).singleton() })
    const instance = c.resolve<ServiceA>('svc')
    expect(instance).toBeInstanceOf(ServiceA)
    expect(instance.greet()).toBe('hello')
  })

  test('asClass singleton: same instance on repeated resolves', () => {
    const c = createContainer()
    c.register({ svc: asClass(ServiceA).singleton() })
    expect(c.resolve('svc')).toBe(c.resolve('svc'))
  })

  test('asFunction: calls the factory and returns its result', () => {
    const c = createContainer()
    c.register({ svc: asFunction(() => new ServiceA()).singleton() })
    const instance = c.resolve<ServiceA>('svc')
    expect(instance).toBeInstanceOf(ServiceA)
  })

  test('resolving an unregistered token throws', () => {
    const c = createContainer()
    expect(() => c.resolve('missing')).toThrow()
  })
})

describe('lifetimeConfig', () => {
  test('SINGLETON equals Lifetime.SINGLETON', () => {
    expect(lifetimeConfig.SINGLETON).toBe(Lifetime.SINGLETON)
  })

  test('SCOPED equals Lifetime.SCOPED', () => {
    expect(lifetimeConfig.SCOPED).toBe(Lifetime.SCOPED)
  })

  test('TRANSIENT equals Lifetime.TRANSIENT', () => {
    expect(lifetimeConfig.TRANSIENT).toBe(Lifetime.TRANSIENT)
  })
})

describe('InjectionMode', () => {
  test('PROXY mode is available', () => {
    expect(InjectionMode.PROXY).toBeDefined()
  })
})
