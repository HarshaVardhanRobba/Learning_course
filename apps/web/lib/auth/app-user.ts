import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { getDb, type Db } from '@/db'
import { users, type User } from '@/db/schema'

type Executor = Db | Parameters<Parameters<Db['transaction']>[0]>[0]

export async function findOrCreateUser(clerkId: string, executor: Executor = getDb()): Promise<User> {
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

/** Resolves the signed-in user from the Clerk session only; redirects anonymous visitors to sign-in. */
export async function requireAppUser(): Promise<User> {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  return findOrCreateUser(userId)
}
