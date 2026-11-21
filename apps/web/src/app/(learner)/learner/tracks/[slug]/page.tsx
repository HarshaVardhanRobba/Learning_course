import { notFound } from 'next/navigation'
import { attemptNumberSchema, trackSlugSchema } from '@workspace/core'
import { CourseMapScreen } from '@/components/learner/course-map-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { caller } from '@/trpc/server'

export async function generateMetadata({ params }: PageProps<'/learner/tracks/[slug]'>) {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
}

export default async function TrackMapPage({ params, searchParams }: PageProps<'/learner/tracks/[slug]'>) {
  // Clerk session -> app user -> approved application in Neon. Foundation completion, the selected
  // attempt and its course version are all resolved on the server for this learner only.
  await requireApprovedLearner()
  const slug = trackSlugSchema.safeParse((await params).slug)
  if (!slug.success) notFound()

  const query = await searchParams
  const attempt = query.attempt === undefined ? undefined : attemptNumberSchema.safeParse(query.attempt)
  if (attempt && !attempt.success) notFound()

  const view = await caller.learner.trackMap({ slug: slug.data, attempt: attempt?.data })
  if (view.kind === 'not_found') notFound()

  return <CourseMapScreen view={view} justCompleted={query.completed === '1'} />
}
