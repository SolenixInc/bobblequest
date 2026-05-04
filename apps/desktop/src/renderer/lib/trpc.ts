import type { AppRouter } from '@t/api'
import { createTRPCReact } from '@trpc/react-query'

// TODO: import from @nutraforgetechnologies/ai â€” wire streaming chat / completion client here once Platform SDK ships
export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>()
