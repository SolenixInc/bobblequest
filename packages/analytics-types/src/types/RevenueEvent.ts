export type RevenueEvent = {
  amount: number
  currency: string
  distinctId: string
  groups?: Record<string, string>
  meta?: Record<string, unknown>
}
