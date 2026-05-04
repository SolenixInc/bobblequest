export type LlmEvent = {
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  traceId: string
  meta?: Record<string, unknown>
}
