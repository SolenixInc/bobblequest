import { router } from '../trpc'
import { authRouter } from './auth'
import { projectsRouter } from './projects'
import { usersRouter } from './users'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  projects: projectsRouter,
})

export type AppRouter = typeof appRouter
