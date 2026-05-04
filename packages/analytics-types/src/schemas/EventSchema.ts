import { z } from 'zod'

export const EventSchema = z.object({
  event: z.string().min(1),
  distinctId: z.string().min(1),
  properties: z.record(z.unknown()),
  groups: z.record(z.string()).optional(),
  timestamp: z.date().optional(),
})

export type Event = z.infer<typeof EventSchema>
