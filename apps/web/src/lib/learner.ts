import 'server-only'
import { redirect } from 'next/navigation'
import { requireAppUser } from '@workspace/auth'
import { findApplicationByUserId, type ApplicationWithReview } from '@workspace/core'
import type { User } from '@workspace/db'
import { LEARNER_ROUTES } from './routes'

/**
 * Gate for every learning page and action: signed in (Clerk), resolved to an app user, and approved
 * in Neon. Anyone else is sent to apply or to their application status.
 */
export async function requireApprovedLearner(): Promise<{ user: User; application: ApplicationWithReview }> {
  const user = await requireAppUser()
  const application = await findApplicationByUserId(user.id)
  if (!application) redirect(LEARNER_ROUTES.apply)
  if (application.status !== 'approved') redirect(LEARNER_ROUTES.status)
  return { user, application }
}
