import { z } from 'zod'
import { applicationDecisionSchema, countApplicationsByStatus, decideApplication, listApplications } from '@workspace/core'
import { adminProcedure, createTRPCRouter } from '../init'

export const adminRouter = createTRPCRouter({
  applications: adminProcedure
    .input(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }))
    .query(({ input }) => listApplications(input.status)),

  applicationCounts: adminProcedure.query(() => countApplicationsByStatus()),

  /** The reviewer is the session admin, never a value from the input. */
  decideApplication: adminProcedure
    .input(applicationDecisionSchema)
    .mutation(({ ctx, input }) => decideApplication({ reviewerUserId: ctx.user.id, decision: input })),
})
