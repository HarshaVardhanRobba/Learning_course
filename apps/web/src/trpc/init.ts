import 'server-only'
import { initTRPC, TRPCError } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { getSessionApplication, getSessionProfile, getSessionUser } from '@/lib/session'

/**
 * The only identity a procedure ever sees is the Clerk session, resolved to the app user.
 * Lookups are cached per request, so server components that check access and then call a
 * procedure do not repeat database work.
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = cache(async () => {
  return { user: await getSessionUser() }
})

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  // Dates (submittedAt, startedAt, earnedAt, ...) survive the wire and hydration as real Date objects.
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: { ...shape.data, zodError: error.cause instanceof ZodError ? error.cause.flatten() : null },
    }
  },
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/** No session required. */
export const baseProcedure = t.procedure

/** Signed in; `ctx.user` is the app user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { user: ctx.user } })
})

/** Signed in and approved in Neon: the gate for all learning content and progress. */
export const learnerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const application = await getSessionApplication(ctx.user.id)
  if (application?.status !== 'approved') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Learning access opens once your application is approved.' })
  }
  return next({ ctx: { application } })
})

/** Admin role is Clerk publicMetadata.role = "admin". */
export const adminProcedure = protectedProcedure.use(async ({ next }) => {
  const profile = await getSessionProfile()
  if (!profile?.isAdmin) throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})
