import 'server-only'
import { cache } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getClerkProfile } from '@workspace/auth'
import { findApplicationByUserId, findOrCreateUserByClerkId } from '@workspace/core'

/**
 * Session lookups shared by the tRPC context and page-level redirects. `cache` dedupes them per
 * request, so a page that checks access and then calls a procedure hits the database once.
 * Identity only ever comes from the Clerk session.
 */
export const getSessionUser = cache(async () => {
  const { userId } = await auth()
  return userId ? findOrCreateUserByClerkId(userId) : null
})

export const getSessionApplication = cache(async (userId: string) => findApplicationByUserId(userId))

/** Clerk profile (verified email, admin role from publicMetadata.role). */
export const getSessionProfile = cache(getClerkProfile)
