import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { applications, getDb, type Application, type Executor } from '@workspace/db'

/** Pass the id of the session-resolved user only; never an id taken from the request. */
export async function findApplicationByUserId(
  userId: string,
  executor: Executor = getDb(),
): Promise<Application | null> {
  const [application] = await executor
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.submittedAt))
    .limit(1)
  return application ?? null
}
