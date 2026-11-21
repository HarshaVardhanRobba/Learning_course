import 'server-only'
import { notFound } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { findOrCreateUserByClerkId } from '@workspace/core'
import type { User } from '@workspace/db'

export type ClerkProfile = { clerkId: string; email: string | null; firstName: string; lastName: string; isAdmin: boolean }

/** Reads profile fields from Clerk's Backend API; the email is Clerk's verified primary address. */
export async function getClerkProfile(): Promise<ClerkProfile | null> {
  const user = await currentUser()
  if (!user) return null
  return {
    clerkId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    isAdmin: user.publicMetadata?.role === 'admin',
  }
}

/** Admin role is set in Clerk as publicMetadata.role = "admin". Non-admins get a 404 so the area isn't advertised. */
export async function requireAdmin(): Promise<User> {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  const profile = await getClerkProfile()
  if (!profile?.isAdmin) notFound()
  return findOrCreateUserByClerkId(userId)
}
