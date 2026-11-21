import { notFound } from 'next/navigation'
import { getFoundationMap } from '@workspace/core'
import { CourseMapScreen } from '@/components/learner/course-map-screen'
import { requireApprovedLearner } from '@/lib/learner'

export const metadata = { title: 'Common Foundation' }

export default async function FoundationMapPage({ searchParams }: PageProps<'/learner/foundation'>) {
  // Clerk session -> app user -> approved application in Neon. The attempt is resolved from the session only.
  const { user } = await requireApprovedLearner()
  const view = await getFoundationMap(user.id)
  if (view.kind === 'not_found') notFound()

  return <CourseMapScreen view={view} justCompleted={(await searchParams).completed === '1'} />
}
