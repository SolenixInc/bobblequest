import { TRPCError, initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  /* v8 ignore next 9 — errorFormatter runs inside tRPC server adapter; unreachable via createCaller */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

/**
 * Requires a valid Clerk session. Narrows `ctx.userId` / `ctx.user` to
 * non-null so downstream procedures can rely on the authenticated identity.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    })
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      user: ctx.user,
    },
  })
})

/**
 * Requires the authenticated user carry the `admin` role claim. The role is
 * sourced from Clerk session claims (typically `publicMetadata.role`) by
 * `createContext`.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({ ctx })
})
