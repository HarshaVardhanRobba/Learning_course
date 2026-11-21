import { notFound } from 'next/navigation'
import { NextResponse } from 'next/server'
import { lessonIdSchema } from '@workspace/core'
import { requireApprovedLearner } from '@/lib/learner'
import { caller } from '@/trpc/server'

/**
 * Lesson resources are never linked directly. This checks the learner's access to the lesson (attempt,
 * version, unlock state) on every request, then redirects to the target. Private R2 files get a presigned
 * URL valid for about a minute, so a copied link stops working almost immediately.
 */
export async function GET(_request: Request, { params }: RouteContext<'/learner/resources/[id]'>) {
  await requireApprovedLearner()
  const id = lessonIdSchema.safeParse((await params).id)
  if (!id.success) notFound()

  const url = await caller.learner.resourceUrl({ resourceId: id.data })
  if (!url) notFound()

  const response = NextResponse.redirect(url, 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
