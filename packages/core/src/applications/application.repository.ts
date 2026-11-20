import 'server-only'
import { asc, desc, eq, sql, type SQL } from 'drizzle-orm'
import {
  applicationReviews,
  applications,
  getDb,
  type Application,
  type ApplicationReview,
  type Executor,
} from '@workspace/db'

export type ApplicationWithReview = Application & { review: ApplicationReview | null }

async function selectWithReview(executor: Executor, where: SQL | undefined, limit?: number): Promise<ApplicationWithReview[]> {
  const query = executor
    .select({ application: applications, review: applicationReviews })
    .from(applications)
    .leftJoin(applicationReviews, eq(applicationReviews.applicationId, applications.id))
    .where(where)
    .orderBy(
      sql`case when ${applications.status} = 'pending' then 0 else 1 end`,
      asc(applications.submittedAt),
      desc(applicationReviews.createdAt),
    )
  const rows = limit ? await query.limit(limit) : await query
  return rows.map((row) => ({ ...row.application, review: row.review }))
}

/** Pass the id of the session-resolved user only; never an id taken from the request. */
export async function findApplicationByUserId(
  userId: string,
  executor: Executor = getDb(),
): Promise<ApplicationWithReview | null> {
  const [application] = await selectWithReview(executor, eq(applications.userId, userId), 1)
  return application ?? null
}

export async function findApplications(where?: SQL, executor: Executor = getDb()): Promise<ApplicationWithReview[]> {
  return selectWithReview(executor, where)
}
