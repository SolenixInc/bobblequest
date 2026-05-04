import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'

/**
 * Auth-facing tRPC procedures.
 *
 * Identity (tokens, sessions, password lifecycle) is owned by Clerk — this
 * router only exposes views over `ctx.user` (Clerk session projection) and
 * mirrors profile edits down to the app-side `users` table.
 *
 * DB writes will route through `UserRepository` (resolved from the DI
 * container) once `registerDbDI` is wired into the composition root; until
 * then, `updateProfile` echoes the input back so the surface stays stable
 * for the web / mobile / desktop clients.
 */
export const authRouter = router({
  /**
   * Returns the current Clerk session projection (id, role, email), or null
   * for unauthenticated requests.
   */
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user
  }),

  /**
   * Update the current user's profile metadata.
   *
   * TODO(wiring): persist via `UserRepository.update(ctx.userId, ...)` once
   * the DI container is bootstrapped in `apps/api/src/index.ts`.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.userRepository.update(ctx.userId, input)
    }),
})
