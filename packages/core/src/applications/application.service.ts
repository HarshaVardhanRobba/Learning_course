import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { applicationReviews, applications, getDb, type Application, type ApplicationStatus } from '@workspace/db'
import { isUniqueViolation } from '../lib/pg-errors'
import { findOrCreateUserByClerkId } from '../users/user.repository'
import { findApplicationByUserId, findApplications, type ApplicationWithReview } from './application.repository'
import type { ApplicationDecision, ApplicationInput } from './application.schema'

export type SubmitResult = { ok: true; application: Application } | { ok: false; reason: 'already_submitted' }

/** Identity (clerkId, email) must come from the verified session, never from form input. */
export async function submitApplication(params: {
  clerkId: string
  email: string
  input: ApplicationInput
}): Promise<SubmitResult> {
  try {
    return await getDb().transaction(async (tx) => {
      const user = await findOrCreateUserByClerkId(params.clerkId, tx)
      if (await findApplicationByUserId(user.id, tx)) return { ok: false, reason: 'already_submitted' } as const

      const [application] = await tx
        .insert(applications)
        .values({ userId: user.id, email: params.email, ...params.input })
        .returning()
      return { ok: true, application: application! } as const
    })
  } catch (error) {
    // A concurrent submit can pass the pre-check; the unique(user_id) constraint is the real guard.
    if (isUniqueViolation(error)) return { ok: false, reason: 'already_submitted' }
    throw error
  }
}

export async function listApplications(status?: ApplicationStatus): Promise<ApplicationWithReview[]> {
  return findApplications(status ? eq(applications.status, status) : undefined)
}

export async function countApplicationsByStatus(): Promise<Record<ApplicationStatus, number>> {
  const rows = await getDb()
    .select({ status: applications.status, count: sql<number>`count(*)::int` })
    .from(applications)
    .groupBy(applications.status)
  const counts: Record<ApplicationStatus, number> = { pending: 0, approved: 0, rejected: 0 }
  for (const row of rows) counts[row.status] = row.count
  return counts
}

export type DecisionResult = { ok: true } | { ok: false; reason: 'not_pending' }

/**
 * Decisions are final: only a pending application can be decided. The status change and the
 * review row are written together, and unique(application_id) on reviews blocks a second decision.
 */
export async function decideApplication(params: {
  reviewerUserId: string
  decision: ApplicationDecision
}): Promise<DecisionResult> {
  const { decision } = params
  const status = decision.decision === 'approve' ? 'approved' : 'rejected'

  try {
    return await getDb().transaction(async (tx) => {
      const updated = await tx
        .update(applications)
        .set({ status })
        .where(and(eq(applications.id, decision.applicationId), eq(applications.status, 'pending')))
        .returning({ id: applications.id })
      if (!updated.length) return { ok: false, reason: 'not_pending' } as const

      await tx.insert(applicationReviews).values({
        applicationId: decision.applicationId,
        reviewerId: params.reviewerUserId,
        decision: status,
        rejectionReason: decision.decision === 'reject' ? decision.reason : null,
      })
      return { ok: true } as const
    })
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'not_pending' }
    throw error
  }
}
