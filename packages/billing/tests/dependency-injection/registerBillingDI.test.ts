import { createContainer, dependencyKeys } from '@t/dependency-injection'
import { describe, expect, it } from 'vitest'
import {
  BILLING_REPOSITORY_DEPENDENCY_KEY,
  registerBillingDI,
} from '../../src/dependency-injection/registerBillingDI.ts'
import { CompositeBillingImpl } from '../../src/infrastructure/CompositeBillingImpl.ts'

const stripeConfig = {
  apiKey: 'sk_test_dummy',
  redirectDomain: 'https://example.com',
  webhookSecret: 'whsec_test',
}

const revenuecatConfig = {
  apiKey: 'rc_test_key',
  projectId: 'proj_test',
  nutraforgeEntitlementId: 'ent_test',
}

describe('registerBillingDI', () => {
  it('registers BILLING_REPOSITORY as a CompositeBillingImpl singleton', () => {
    const container = createContainer()
    registerBillingDI(container, {
      stripeConfig,
      revenuecatConfig,
      revenuecatWebhookAuthHeader: 'shared-secret',
    })

    const billing = container.resolve(BILLING_REPOSITORY_DEPENDENCY_KEY)
    expect(billing).toBeInstanceOf(CompositeBillingImpl)
  })

  it('BILLING_REPOSITORY_DEPENDENCY_KEY matches dependencyKeys.global token', () => {
    expect(BILLING_REPOSITORY_DEPENDENCY_KEY).toBe(dependencyKeys.global.BILLING_REPOSITORY)
  })

  it('resolves the same instance on repeated resolves (singleton)', () => {
    const container = createContainer()
    registerBillingDI(container, {
      stripeConfig,
      revenuecatConfig,
      revenuecatWebhookAuthHeader: 'shared-secret',
    })

    const first = container.resolve(BILLING_REPOSITORY_DEPENDENCY_KEY)
    const second = container.resolve(BILLING_REPOSITORY_DEPENDENCY_KEY)
    expect(first).toBe(second)
  })

  it('throws at registration time when revenuecatWebhookAuthHeader is empty (eager validation)', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig,
        revenuecatConfig,
        revenuecatWebhookAuthHeader: '',
      }),
    ).toThrow(/revenuecatWebhookAuthHeader/i)
  })

  it('throws at registration time, NOT at resolve time (asValue eagerness)', () => {
    const container = createContainer()
    let registrationThrew = false
    try {
      registerBillingDI(container, {
        stripeConfig,
        revenuecatConfig,
        revenuecatWebhookAuthHeader: '',
      })
    } catch {
      registrationThrew = true
    }
    expect(registrationThrew).toBe(true)
  })

  it('throws with message referencing apiKey when stripeConfig.apiKey is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig: { ...stripeConfig, apiKey: '' },
        revenuecatConfig,
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/apiKey/i)
  })

  it('throws with message referencing apiKey when revenuecatConfig.apiKey is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig,
        revenuecatConfig: { ...revenuecatConfig, apiKey: '' },
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/apiKey/i)
  })

  it('throws with message referencing nutraforgeEntitlementId when it is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig,
        revenuecatConfig: { ...revenuecatConfig, nutraforgeEntitlementId: '' },
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/nutraforgeEntitlementId/i)
  })

  it('throws when stripeConfig.redirectDomain is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig: { ...stripeConfig, redirectDomain: '' },
        revenuecatConfig,
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/redirectDomain/i)
  })

  it('throws when stripeConfig.webhookSecret is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig: { ...stripeConfig, webhookSecret: '' },
        revenuecatConfig,
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/webhookSecret/i)
  })

  it('throws when revenuecatConfig.projectId is missing', () => {
    const container = createContainer()
    expect(() =>
      registerBillingDI(container, {
        stripeConfig,
        revenuecatConfig: { ...revenuecatConfig, projectId: '' },
        revenuecatWebhookAuthHeader: 'shared-secret',
      }),
    ).toThrow(/projectId/i)
  })
})
