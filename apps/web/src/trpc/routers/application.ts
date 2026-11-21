import { TRPCError } from '@trpc/server'
import { applicationInputSchema, findApplicationByUserId, submitApplication } from '@workspace/core'
import { getSessionProfile } from '@/lib/session'
import { createTRPCRouter, protectedProcedure } from '../init'

export const applicationRouter = createTRPCRouter({
  /** The session user's own application, if any. */
  mine: protectedProcedure.query(({ ctx }) => findApplicationByUserId(ctx.user.id)),

  /** Name and email defaults for the apply form, straight from Clerk. */
  profileDefaults: protectedProcedure.query(async () => {
    const profile = await getSessionProfile()
    return { firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', email: profile?.email ?? '' }
  }),

  /** Identity and email come from Clerk, never from the input. */
  submit: protectedProcedure.input(applicationInputSchema).mutation(async ({ input }) => {
    const profile = await getSessionProfile()
    if (!profile) throw new TRPCError({ code: 'UNAUTHORIZED' })
    if (!profile.email) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Your account has no email address.' })
    }
    return submitApplication({ clerkId: profile.clerkId, email: profile.email, input })
  }),
})
