import { notFound } from 'next/navigation'
import { CourseMapScreen } from '@/components/learner/course-map-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Common Foundation' }

export default async function FoundationMapPage({ searchParams }: PageProps<'/learner/foundation'>) {
  // Clerk session -> app user -> approved application in Neon. The attempt is resolved from the session only.
  await requireApprovedLearner()
  const view = await caller.learner.foundationMap()
  if (view.kind === 'not_found') notFound()

  return <CourseMapScreen view={view} justCompleted={(await searchParams).completed === '1'} />
}
