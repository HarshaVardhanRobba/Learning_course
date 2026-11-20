import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { applications, type Application } from '@/db/schema'

export async function getApplicationForUser(userId: string): Promise<Application | null> {
  const [application] = await getDb()
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .limit(1)
  return application ?? null
}

export const LEARNER_ROUTES = {
  apply: '/learner/application',
  status: '/learner/application/status',
  dashboard: '/learner',
} as const
