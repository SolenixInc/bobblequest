import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'

/**
 * Users router.
 *
 * Reads / writes against the app-side `users` table will flow through
 * `UserRepository` (resolved from the DI container) once `registerDbDI` is
 * wired into `apps/api/src/index.ts`. The procedures below keep their public
 * shape so typed clients (`apps/web`, `apps/mobile`, `apps/desktop`) continue
 * to compile during the migration; they return session-derived data today.
 */
export const usersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.userRepository.list(input)
      return {
        users,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user
  }),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.userRepository.update(ctx.userId, input)
    }),
})
