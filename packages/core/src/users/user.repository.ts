import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb, users, type Executor, type User } from '@workspace/db'

export async function findOrCreateUserByClerkId(clerkId: string, executor: Executor = getDb()): Promise<User> {
  const [inserted] = await executor
    .insert(users)
    .values({ clerkId })
    .onConflictDoNothing({ target: users.clerkId })
    .returning()
  if (inserted) return inserted

  const [existing] = await executor.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  if (!existing) throw new Error('User record could not be resolved.')
  return existing
}
