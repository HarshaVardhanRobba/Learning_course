import 'server-only'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type { ApplicationWithReview } from '@workspace/core'
import type { User } from '@workspace/db'
import { LEARNER_ROUTES } from './routes'
import { getSessionApplication, getSessionUser } from './session'

/** Signed-in app user, or a redirect to sign-in. For pages; procedures enforce the same rule themselves. */
export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser()
  if (!user) return (await auth()).redirectToSignIn()
  return user
}

/**
 * Page gate for learning content: signed in, resolved to an app user, and approved in Neon. Others are
 * sent to apply or to their status. tRPC learner procedures re-check this, so it is UX, not the only guard.
 */
export async function requireApprovedLearner(): Promise<{ user: User; application: ApplicationWithReview }> {
  const user = await requireSessionUser()
  const application = await getSessionApplication(user.id)
  if (!application) redirect(LEARNER_ROUTES.apply)
  if (application.status !== 'approved') redirect(LEARNER_ROUTES.status)
  return { user, application }
}
