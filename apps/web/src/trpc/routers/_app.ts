import { createTRPCRouter } from '../init'
import { adminRouter } from './admin'
import { applicationRouter } from './application'
import { learnerRouter } from './learner'

export const appRouter = createTRPCRouter({
  application: applicationRouter,
  learner: learnerRouter,
  admin: adminRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
