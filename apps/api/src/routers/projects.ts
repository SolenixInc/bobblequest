import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

/**
 * Projects router.
 *
 * The `projects` domain model is not yet defined in `@t/db` — no Drizzle
 * schema, no `ProjectRepository` port. These procedures retain their public
 * shapes so typed clients remain stable, but each throws
 * `NOT_IMPLEMENTED` until the domain lands. Owner scoping uses `ctx.userId`
 * (Clerk session subject) once wired.
 */
export const projectsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.projectRepository.findByOwnerId(ctx.userId, input)
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.projectRepository.findById(input.id)
      if (!project || project.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }
      return project
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.projectRepository.create({
        ...input,
        ownerId: ctx.userId,
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'archived', 'deleted']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.projectRepository.findById(input.id)
      if (!project || project.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      const { id, ...updateData } = input
      return ctx.projectRepository.update(id, updateData)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.projectRepository.findById(input.id)
      if (!project || project.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }
      return ctx.projectRepository.delete(input.id)
    }),
})
