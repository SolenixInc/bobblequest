import {
  AnalyticsTracker,
  type AnalyticsTrackerOptions,
  type LlmEvent,
  type RevenueEvent,
} from '@t/analytics-types'
import { createGlobalLogger } from '@t/logging'

/** No-op analytics tracker: swallows all events, returns defaults. Default binding when analytics is disabled. */
export class NoOpAnalyticsTracker extends AnalyticsTracker {
  private readonly environment: AnalyticsTrackerOptions['environment']
  private readonly service: AnalyticsTrackerOptions['service']
  private readonly logger = createGlobalLogger({})

  constructor({ environment, service }: AnalyticsTrackerOptions) {
    super()
    if (!environment) throw new TypeError('environment required')
    if (!service) throw new TypeError('service required')
    this.environment = environment
    this.service = service
  }

  capture(
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>,
    groups?: Record<string, string>,
  ): void {
    this.logger.debug(
      {
        message: 'noop capture',
        metadata: {
          environment: this.environment,
          service: this.service,
          event,
          distinctId,
          properties,
          groups,
        },
      },
      '',
    )
  }

  captureException(error: Error, distinctId: string, properties?: Record<string, unknown>): void {
    this.logger.debug(
      {
        message: 'noop captureException',
        metadata: {
          environment: this.environment,
          service: this.service,
          error: { name: error.name, message: error.message },
          distinctId,
          properties,
        },
      },
      '',
    )
  }

  captureRevenue(event: RevenueEvent): void {
    this.logger.debug(
      {
        message: 'noop captureRevenue',
        metadata: {
          environment: this.environment,
          service: this.service,
          event,
        },
      },
      '',
    )
  }

  captureLlm(event: LlmEvent): void {
    this.logger.debug(
      {
        message: 'noop captureLlm',
        metadata: {
          environment: this.environment,
          service: this.service,
          event,
        },
      },
      '',
    )
  }

  identify(distinctId: string, traits?: Record<string, unknown>): void {
    this.logger.debug(
      {
        message: 'noop identify',
        metadata: {
          environment: this.environment,
          service: this.service,
          distinctId,
          traits,
        },
      },
      '',
    )
  }

  alias(distinctId: string, alias: string): void {
    this.logger.debug(
      {
        message: 'noop alias',
        metadata: {
          environment: this.environment,
          service: this.service,
          distinctId,
          alias,
        },
      },
      '',
    )
  }

  group(groupType: string, groupKey: string, traits?: Record<string, unknown>): void {
    this.logger.debug(
      {
        message: 'noop group',
        metadata: {
          environment: this.environment,
          service: this.service,
          groupType,
          groupKey,
          traits,
        },
      },
      '',
    )
  }

  captureScreen(screenName: string, properties?: Record<string, unknown>): void {
    this.logger.debug(
      {
        message: 'noop captureScreen',
        metadata: {
          environment: this.environment,
          service: this.service,
          screenName,
          properties,
        },
      },
      '',
    )
  }

  sessionId(): string {
    return 'noop-session'
  }

  isFeatureEnabled(_key: string, _distinctId: string): Promise<boolean> {
    return Promise.resolve(false)
  }

  getAllFlags(_distinctId: string): Promise<Record<string, boolean | string>> {
    return Promise.resolve({})
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
