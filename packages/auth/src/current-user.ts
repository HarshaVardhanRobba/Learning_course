import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { findOrCreateUserByClerkId } from '@workspace/core'
import type { User } from '@workspace/db'

/** Resolves the signed-in user from the Clerk session only; redirects anonymous visitors to sign-in. */
export async function requireAppUser(): Promise<User> {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  return findOrCreateUserByClerkId(userId)
}
