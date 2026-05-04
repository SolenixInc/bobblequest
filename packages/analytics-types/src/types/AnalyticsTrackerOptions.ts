import type { Environment } from './Environment.ts'
import type { Service } from './Service.ts'

export type AnalyticsTrackerOptions = {
  environment: Environment
  service: Service
  apiKey?: string
  host?: string
  enabled?: boolean
}
